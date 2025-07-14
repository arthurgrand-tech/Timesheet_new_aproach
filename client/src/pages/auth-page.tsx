import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, BarChart3, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  tenantName: z.string().min(1, "Company name is required"),
  tenantSlug: z.string().min(1, "Company slug is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "user",
      tenantName: "",
      tenantSlug: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (data: LoginData) => {
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      await registerMutation.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">TimeTracker Pro</h1>
            <p className="text-muted-foreground mt-2">Professional time tracking for teams</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        {...loginForm.register("username")}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Set up your organization and admin account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          {...registerForm.register("firstName")}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          {...registerForm.register("lastName")}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        {...registerForm.register("email")}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="johndoe"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenantName">Company Name</Label>
                      <Input
                        id="tenantName"
                        type="text"
                        placeholder="Acme Corporation"
                        {...registerForm.register("tenantName")}
                      />
                      {registerForm.formState.errors.tenantName && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.tenantName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenantSlug">Company Slug</Label>
                      <Input
                        id="tenantSlug"
                        type="text"
                        placeholder="acme-corp"
                        {...registerForm.register("tenantSlug")}
                      />
                      {registerForm.formState.errors.tenantSlug && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.tenantSlug.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        onValueChange={(value) => registerForm.setValue("role", value as any)}
                        defaultValue="admin"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.role && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="flex-1 bg-primary/5 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <Users className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Team Management</h3>
                <p className="text-xs text-muted-foreground">Role-based access control</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <BarChart3 className="w-8 h-8 text-accent mb-2" />
                <h3 className="font-semibold text-sm">Analytics</h3>
                <p className="text-xs text-muted-foreground">Detailed reporting</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <Clock className="w-8 h-8 text-warning mb-2" />
                <h3 className="font-semibold text-sm">Time Tracking</h3>
                <p className="text-xs text-muted-foreground">Weekly timesheets</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <Shield className="w-8 h-8 text-destructive mb-2" />
                <h3 className="font-semibold text-sm">Multi-Tenant</h3>
                <p className="text-xs text-muted-foreground">Secure isolation</p>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Professional Time Tracking
          </h2>
          <p className="text-muted-foreground mb-6">
            Streamline your team's time management with role-based access, 
            project tracking, and comprehensive reporting.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <span>✓ Multi-tenant</span>
            <span>✓ Role-based access</span>
            <span>✓ Project management</span>
          </div>
        </div>
      </div>
    </div>
  );
}
