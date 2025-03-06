"""
URL configuration for sphere project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from users.views import BusinessAuthTokenView

schema_view = get_schema_view(
    openapi.Info(
        title="Sphere API",
        default_version='v1',
        description="API for Sphere application",
        contact=openapi.Contact(email="contact@sphereapp.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Authentication
    path('api/auth/', include('djoser.urls')),
    path('api/auth/token/login/', BusinessAuthTokenView.as_view(), name='login-with-business'),  # Override with business-aware login
    path('api/auth/', include('djoser.urls.authtoken')),
    
    # Add alternative auth endpoints without /api prefix for direct access
    path('auth/', include('djoser.urls')),
    path('auth/token/login/', BusinessAuthTokenView.as_view(), name='login-with-business-alt'),
    path('auth/', include('djoser.urls.authtoken')),
    
    # API endpoints with /api prefix
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/business/', include('business.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/wiki/', include('wiki.urls')),
    path('api/time-management/', include('time_management.urls')),
    
    # Add non-prefixed alternatives for key endpoints to support legacy clients
    path('tasks/', include('tasks.urls')),
    path('clients/', include('clients.urls')),
    path('business/', include('business.urls')),
    path('users/', include('users.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
