from django.db import models
from apps.users.models import User


class CommunityGroup(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class GroupPost(models.Model):
    group = models.ForeignKey(CommunityGroup, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_posts')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Post by {self.author} in {self.group}'


class PostLike(models.Model):
    post = models.ForeignKey(GroupPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_likes')

    class Meta:
        unique_together = [('post', 'user')]

    def __str__(self):
        return f'{self.user} likes post #{self.post_id}'


class PostReply(models.Model):
    post = models.ForeignKey(GroupPost, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Reply by {self.author} on post #{self.post_id}'
