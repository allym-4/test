from rest_framework import serializers
from .models import CommunityGroup, GroupPost, PostLike, PostReply


class CommunityGroupSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunityGroup
        fields = ('id', 'name', 'description', 'is_active', 'post_count')

    def get_post_count(self, obj):
        return obj.posts.count()


class GroupPostSerializer(serializers.ModelSerializer):
    author_name = serializers.StringRelatedField(source='author')
    like_count = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupPost
        fields = ('id', 'group', 'author_name', 'body', 'created_at', 'like_count', 'reply_count')

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_reply_count(self, obj):
        return obj.replies.count()


class PostReplySerializer(serializers.ModelSerializer):
    author_name = serializers.StringRelatedField(source='author')

    class Meta:
        model = PostReply
        fields = ('id', 'post', 'author_name', 'body', 'created_at')
