from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrInstructor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'instructor', 'staff')


class IsAdminInstructorOrSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role in ('admin', 'instructor'):
            return True
        return obj == request.user
