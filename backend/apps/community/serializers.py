from rest_framework import serializers
from .models import CommunityGroup, GroupPost, PostLike, PostReply


class CommunityGroupSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunityGroup
        fields = ('id', 'name', 'description', 'is_active', 'post_count', 'is_member', 'member_count')

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.members.filter(pk=request.user.pk).exists()

    def get_member_count(self, obj):
        return obj.members.count()


class GroupPostSerializer(serializers.ModelSerializer):
    author_name = serializers.StringRelatedField(source='author')
    like_count = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupPost
        fields = ('id', 'group', 'author_name', 'body', 'is_approved', 'created_at', 'like_count', 'reply_count')

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_reply_count(self, obj):
        return obj.replies.count()


class PostReplySerializer(serializers.ModelSerializer):
    author_name = serializers.StringRelatedField(source='author')

    class Meta:
        model = PostReply
        fields = ('id', 'post', 'author_name', 'body', 'created_at')
