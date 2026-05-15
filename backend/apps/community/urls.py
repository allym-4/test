from django.urls import path
from . import views

urlpatterns = [
    path('groups/', views.CommunityGroupListView.as_view()),
    path('groups/<int:pk>/', views.CommunityGroupDetailView.as_view()),
    path('posts/', views.GroupPostListView.as_view()),
    path('posts/<int:pk>/', views.GroupPostDetailView.as_view()),
    path('posts/like/', views.PostLikeView.as_view()),
    path('replies/', views.PostReplyListView.as_view()),
    path('groups/<int:pk>/join/', views.GroupJoinView.as_view()),
    path('groups/<int:pk>/leave/', views.GroupLeaveView.as_view()),
    path('groups/<int:pk>/posts/', views.GroupPostsView.as_view()),
]
