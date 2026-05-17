from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import CommunityGroup, GroupPost, PostLike, PostReply
from .serializers import CommunityGroupSerializer, GroupPostSerializer, PostReplySerializer
from apps.users.permissions import IsAdminOrInstructor


class CommunityGroupListView(generics.ListCreateAPIView):
    serializer_class = CommunityGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CommunityGroup.objects.all()


class CommunityGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommunityGroupSerializer
    queryset = CommunityGroup.objects.all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminOrInstructor()]
        return [permissions.IsAuthenticated()]


class GroupPostListView(generics.ListCreateAPIView):
    serializer_class = GroupPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = GroupPost.objects.select_related('author', 'group')
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        if not self.request.user.role in ('admin', 'staff', 'instructor'):
            qs = qs.filter(is_approved=True)
        elif self.request.query_params.get('pending') == 'true':
            qs = qs.filter(is_approved=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class GroupPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupPostSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = GroupPost.objects.select_related('author', 'group')


class PostLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'detail': 'post_id required'}, status=400)
        try:
            post = GroupPost.objects.get(pk=post_id)
        except GroupPost.DoesNotExist:
            return Response({'detail': 'Post not found'}, status=404)

        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            return Response({'liked': False})
        return Response({'liked': True}, status=201)


class PostReplyListView(generics.ListCreateAPIView):
    serializer_class = PostReplySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PostReply.objects.select_related('author', 'post')
        post_id = self.request.query_params.get('post')
        if post_id:
            qs = qs.filter(post_id=post_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class GroupJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            group = CommunityGroup.objects.get(pk=pk)
        except CommunityGroup.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        group.members.add(request.user)
        return Response({'joined': True})


class GroupLeaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            group = CommunityGroup.objects.get(pk=pk)
        except CommunityGroup.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        group.members.remove(request.user)
        return Response({'left': True})


class GroupPostsView(generics.ListCreateAPIView):
    serializer_class = GroupPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = GroupPost.objects.select_related('author').filter(group_id=self.kwargs['pk'])
        if not self.request.user.role in ('admin', 'staff', 'instructor'):
            qs = qs.filter(is_approved=True)
        return qs

    def perform_create(self, serializer):
        group = CommunityGroup.objects.get(pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, group=group)
