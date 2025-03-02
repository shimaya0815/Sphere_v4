from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from django.http import Http404
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class BusinessSeparationMiddleware(MiddlewareMixin):
    """
    Middleware to ensure strict business separation.
    Users from one business cannot access data from another business.
    """
    
    # Paths that don't need business separation checks
    EXEMPT_PATHS = [
        '/admin/', 
        '/api/auth/', 
        '/swagger/',
        '/redoc/',
        '/static/',
        '/media/',
        '/',
    ]
    
    def is_path_exempt(self, path):
        """Check if the current path is exempt from business separation."""
        return any(path.startswith(exempt_path) for exempt_path in self.EXEMPT_PATHS)
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        # Skip exempt paths
        if self.is_path_exempt(request.path):
            return None
            
        # Check if user is authenticated
        if not request.user.is_authenticated:
            # Authentication will be handled by DRF
            return None
            
        # Get business_id from URL kwargs if it exists
        business_id = view_kwargs.get('business_id')
        
        if business_id and request.user.business:
            # If a specific business is being accessed, make sure it matches the user's business
            if str(request.user.business.business_id) != str(business_id):
                return HttpResponseForbidden("You don't have access to this business's data")
        
        # For all other views, proceed as normal
        # Individual views should filter querysets by user.business
        return None