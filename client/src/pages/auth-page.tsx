import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Redirect, Link } from "wouter"
import { Loader2, ArrowLeft } from "lucide-react"
import { authClient, signIn, signUp, signOut } from "@/lib/auth-client"

export default function AuthPage() {
  const { data: session } = authClient.useSession()
  const { toast } = useToast()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })
  
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Redirect if already authenticated
  if (session?.user) {
    // If user has no role, redirect to role selection
    if (!session.user.role) {
      return <Redirect to="/role-selection" />
    }
    // If user has a role, redirect to dashboard
    return <Redirect to="/" />
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    
    try {
      const { data, error } = await signIn.email({
        email: signInData.email,
        password: signInData.password,
        rememberMe,
        callbackURL: "/"
      }, {
        onRequest: () => {
          console.log('Sign in request started')
        },
        onSuccess: () => {
          toast({ title: "Welcome back!", description: "Successfully signed in." })
        },
        onError: (ctx) => {
          toast({
            title: "Sign in failed",
            description: ctx.error.message || "Invalid email or password",
            variant: "destructive",
          })
        }
      })
    } catch (error: any) {
      console.warn('Sign in error caught:', error)
      toast({
        title: "Sign in failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }
    
    setIsSigningUp(true)
    
    try {
      const { data, error } = await signUp.email({
        email: signUpData.email,
        password: signUpData.password,
        name: signUpData.name,
        callbackURL: "/role-selection"
      }, {
        onRequest: () => {
          console.log('Sign up request started')
        },
        onSuccess: () => {
          toast({ 
            title: "Account created!", 
            description: `Welcome to Recrutas, ${signUpData.name}! Please select your role.` 
          })
        },
        onError: (ctx) => {
          toast({
            title: "Sign up failed",
            description: ctx.error.message || "Failed to create account",
            variant: "destructive",
          })
        }
      })
    } catch (error: any) {
      console.warn('Sign up error caught:', error)
      toast({
        title: "Sign up failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'microsoft') => {
    try {
      await signIn.social({ 
        provider,
        callbackURL: window.location.origin 
      })
    } catch (error: any) {
      toast({
        title: "Social sign in failed",
        description: error.message || `Failed to sign in with ${provider}`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>
        
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-800 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                !isSignUp 
                  ? 'text-white border-white' 
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isSignUp 
                  ? 'text-white border-white' 
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {!isSignUp && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Sign In</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter your email below to login to your account
              </p>
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="m@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-gray-400 hover:text-white underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="password"
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-300">
                    Remember me
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-gray-100"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Sign Up Form */}
          {isSignUp && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Sign Up</h2>
              <p className="text-gray-400 text-sm mb-6">
                Create a new account to get started
              </p>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="m@example.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-confirm-password" className="text-gray-300">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="confirm password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 mt-1"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-gray-100"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Social Sign In */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => handleSocialSignIn('google')}
              variant="outline"
              className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
            
            <Button
              onClick={() => handleSocialSignIn('github')}
              variant="outline"
              className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </Button>
            
            <Button
              onClick={() => handleSocialSignIn('microsoft')}
              variant="outline"
              className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M0 0h11v11H0V0zm13 0h11v11H13V0zM0 13h11v11H0V13zm13 0h11v11H13V13z"/>
              </svg>
              Sign in with Microsoft
            </Button>
          </div>

          {/* Better Auth Attribution */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              built with{' '}
              <a 
                href="https://better-auth.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-gray-400"
              >
                better-auth
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}