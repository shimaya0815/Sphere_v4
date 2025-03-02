from rest_framework import permissions


class IsBusinessOwner(permissions.BasePermission):
    """Permission to allow only business owners to perform certain actions."""
    
    def has_object_permission(self, request, view, obj):
        """Check if the requesting user is the owner of the business."""
        return obj.owner == request.user


class IsBusinessMember(permissions.BasePermission):
    """Permission to allow only business members to access the business."""
    
    def has_object_permission(self, request, view, obj):
        """Check if the requesting user is a member of the business."""
        return request.user.business == obj


class IsWorkspaceMember(permissions.BasePermission):
    """Permission to allow only members of a workspace's business to access it."""
    
    def has_object_permission(self, request, view, obj):
        """Check if the requesting user is a member of the workspace's business."""
        return request.user.business == obj.business


class IsSameBusiness(permissions.BasePermission):
    """
    Permission to allow access only to users within the same business.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if the user belongs to the same business as the object.
        Assumes the object has a business attribute or is related to one.
        """
        if not request.user.is_authenticated:
            return False
        
        # Handle objects that directly have a business attribute
        if hasattr(obj, 'business'):
            return obj.business == request.user.business
        
        # Handle objects that relate to a business through a foreign key
        for attr in ['task', 'client']:
            if hasattr(obj, attr) and hasattr(getattr(obj, attr), 'business'):
                return getattr(obj, attr).business == request.user.business
        
        # Default deny if we can't determine the business
        return False