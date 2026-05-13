from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('employee', 'Employee'),
        ('admin', 'Admin'),
    )
    
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    department = models.CharField(max_length=255, default='General')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    # is_active=False blocks Django authentication; admins and approved users are True
    is_active = models.BooleanField(default=False)
    # is_approved tracks explicit admin approval; admins are pre-approved
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    def is_employee(self):
        return self.role == 'employee'
    
    def is_admin_user(self):
        return self.role == 'admin'