import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Redirect, Link } from "wouter"
import { Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function AuthPage() {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    return <Redirect to="/" />
  }

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Sign in failed')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      toast({ title: "Welcome back!", description: "Successfully signed in." })
    },
    onError: (error: Error) => {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const signUpMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include'
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Sign up failed')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      toast({ title: "Welcome!", description: "Account created successfully." })
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    signInMutation.mutate({ email, password })
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    signUpMutation.mutate({ name, email, password })
  }



  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Back to Home link */}
        <Link href="/" className="absolute top-4 left-4 flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black">Recrutas</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">AI-powered job matching platform</p>
          </div>

          {/* Mobile hero section */}
          <div className="lg:hidden bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-black mb-3">Why Choose Recrutas?</h2>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <span className="text-sm text-gray-700">AI-powered job matching</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <span className="text-sm text-gray-700">Direct company connections</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <span className="text-sm text-gray-700">Skip the recruiters</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:text-black">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-black">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card className="border border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-black text-xl">Welcome back</CardTitle>
                  <CardDescription className="text-gray-600">Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-black">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="border-gray-300 focus:border-black h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-black">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        className="border-gray-300 focus:border-black h-11"
                      />
                    </div>
                    
                    {/* Forgot Password Link */}
                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-gray-600 hover:text-black transition-colors duration-200">
                        Forgot your password?
                      </Link>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-black text-white hover:bg-gray-800 transition-colors duration-200 h-11"
                      disabled={signInMutation.isPending}
                    >
                      {signInMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="border border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-black text-xl">Create account</CardTitle>
                  <CardDescription className="text-gray-600">Join Recrutas to find your next opportunity</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-black">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        required
                        className="border-gray-300 focus:border-black h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-black">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="border-gray-300 focus:border-black h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-black">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        required
                        minLength={6}
                        className="border-gray-300 focus:border-black h-11"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-black text-white hover:bg-gray-800 transition-colors duration-200 h-11"
                      disabled={signUpMutation.isPending}
                    >
                      {signUpMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:flex flex-1 bg-black text-white items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-4xl font-bold mb-6">Find Your Perfect Match</h2>
          <p className="text-gray-300 text-lg mb-8">
            Our AI-powered platform connects talented professionals with opportunities that match their skills and aspirations.
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>AI-powered job matching</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Direct company connections</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Real-time opportunities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}