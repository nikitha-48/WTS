from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from accounts.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'department', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'created_at', 'department')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Custom Fields', {
            'fields': ('role', 'department', 'profile_picture', 'created_at', 'updated_at')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important dates', {'fields': ('last_login',)}),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    actions = ['make_admin', 'make_employee', 'deactivate_users', 'activate_users']
    
    def make_admin(self, request, queryset):
        updated = queryset.update(role='admin', is_staff=True, is_superuser=True)
        self.message_user(request, f'{updated} users made admin')
    make_admin.short_description = 'Make selected users admin'
    
    def make_employee(self, request, queryset):
        updated = queryset.update(role='employee', is_staff=False, is_superuser=False)
        self.message_user(request, f'{updated} users made employee')
    make_employee.short_description = 'Make selected users employee'
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users deactivated')
    deactivate_users.short_description = 'Deactivate selected users'
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users activated')
    activate_users.short_description = 'Activate selected users'