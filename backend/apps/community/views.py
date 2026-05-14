from rest_framework import generics, permissions
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
