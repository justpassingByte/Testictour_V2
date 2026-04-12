import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthModalStore } from '@/app/stores/authModalStore';
import { useTranslations } from 'next-intl';
import { AuthClientService } from '@/app/services/AuthClientService';
import { useUserStore } from '@/app/stores/userStore';
import { Coins, Loader2, Sparkles } from "lucide-react"
import { SubRegionSelector } from "@/components/ui/SubRegionSelector"

export function AuthModal() {
  const { isOpen, view, closeModal, setView } = useAuthModalStore();
  const t = useTranslations('common');
  const { setCurrentUser } = useUserStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gameName, setGameName] = useState('');
  const [tagName, setTagName] = useState('');
  const [referrer, setReferrer] = useState('');
  const [region, setRegion] = useState('VN2');
  
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLogin = async () => {
    setLoginError('');
    setIsLoading(true);
    try {
      const { user } = await AuthClientService.login({ login: loginIdentifier, password });
      setCurrentUser(user);
      closeModal();
    } catch (error: any) {
      setLoginError(t('auth.loginError') || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegisterError('');
    if (password !== confirmPassword) {
      setRegisterError(t('auth.passwordMismatch') || 'Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await AuthClientService.register({ username, email, password, gameName, tagName, referrer, region });
      setView('login');
    } catch (error) {
      setRegisterError(t('auth.registerError') || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl flex flex-col md:flex-row shadow-indigo-900/20">
        
        {/* Left Side: Promo Banner (Space Gods Vibe) */}
        <div className="md:w-5/12 relative hidden md:flex flex-col justify-between p-8 bg-black">
          <div className="absolute inset-0 z-0">
            <img 
              src="/auth-banner.png" 
              alt="Space Gods Treasures" 
              className="w-full h-full object-cover opacity-60 mix-blend-screen"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t FROM-indigo-950/90 via-transparent to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-bold tracking-widest uppercase text-indigo-200 text-xs">TesticTour</span>
          </div>

          <div className="relative z-10 mt-auto">
            <div className="inline-flex items-center px-3 py-1 mb-4 border rounded-full bg-amber-500/10 border-amber-500/30 text-amber-400">
              <Coins className="w-4 h-4 mr-2" />
              <span className="text-xs font-semibold tracking-wide uppercase">Welcome Bonus</span>
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 leading-tight mb-4 tracking-tighter">
              Claim Your Space<br/>Divine Gifts.
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-medium">
              Join the tournament realms today and instantly receive <strong className="text-amber-400">1,000 Free Coins</strong> to join premium MiniTour lobbies instantly.
            </p>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="md:w-7/12 p-6 md:p-10 relative">
          
          <Tabs value={view} onValueChange={(value) => setView(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 mb-8 rounded-full bg-zinc-900 border border-zinc-800">
              <TabsTrigger 
                value="login" 
                className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                {t("auth.loginTab")}
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                {t("auth.registerTab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5 flex flex-col">
              <div className="space-y-1 mb-2">
                <h3 className="text-2xl font-bold tracking-tight text-white mb-1">Welcome back, Challenger.</h3>
                <p className="text-sm text-zinc-400">Sign in to your account and rejoin the battles.</p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-identifier" className="text-zinc-300">Username or Email</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                    placeholder="player_one"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-login" className="text-zinc-300">Password</Label>
                    <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
                  </div>
                  <Input
                    id="password-login"
                    type="password"
                    className="bg-zinc-900/50 border-zinc-700 text-white focus-visible:ring-indigo-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {loginError && <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm">{loginError}</div>}
              
              <Button 
                type="submit" 
                className="w-full mt-4 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 flex flex-col">
              <div className="space-y-1 mb-2">
                <h3 className="text-2xl font-bold tracking-tight text-white mb-1">Begin Your Ascendancy.</h3>
                <p className="text-sm text-amber-400 font-medium">Create an account to claim your 1,000 Coins starting gift.</p>
              </div>

              <div className="pr-4 py-2 space-y-4 max-h-[55vh] overflow-y-auto w-full custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username-register" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">Username <span className="text-red-400">*</span></Label>
                    <Input id="username-register" type="text" className="bg-zinc-900/50 border-zinc-700 text-white h-10" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email-register" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">Email <span className="text-red-400">*</span></Label>
                    <Input id="email-register" type="email" className="bg-zinc-900/50 border-zinc-700 text-white h-10" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password-register" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">Password <span className="text-red-400">*</span></Label>
                    <Input id="password-register" type="password" className="bg-zinc-900/50 border-zinc-700 text-white h-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password-register" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">Confirm Password</Label>
                    <Input id="confirm-password-register" type="password" className="bg-zinc-900/50 border-zinc-700 text-white h-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                    Riot Integration
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="grid gap-2">
                      <Label htmlFor="game-name-register" className="text-zinc-400 text-xs font-medium">Game Name</Label>
                      <Input id="game-name-register" type="text" placeholder="e.g. Faker" className="bg-black/40 border-zinc-800 text-white h-9 text-sm" value={gameName} onChange={(e) => setGameName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tag-name-register" className="text-zinc-400 text-xs font-medium">Tag Line</Label>
                      <Input id="tag-name-register" type="text" placeholder="e.g. KR1" className="bg-black/40 border-zinc-800 text-white h-9 text-sm" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="region-register" className="text-zinc-400 text-xs font-medium">Region (Server)</Label>
                    <SubRegionSelector
                      id="region-register"
                      value={region}
                      onChange={setRegion}
                    />
                    <p className="text-[10px] text-zinc-600">Select your Riot server region</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="referrer-register" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">Referral Code (Optional)</Label>
                  <Input id="referrer-register" type="text" className="bg-zinc-900/50 border-zinc-700 text-white h-10" placeholder="Did someone invite you?" value={referrer} onChange={(e) => setReferrer(e.target.value)} />
                </div>
              </div>

              {registerError && <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm mt-2">{registerError}</div>}
              
              <Button 
                type="submit" 
                className="w-full mt-2 h-12 bg-amber-600 hover:bg-amber-500 text-white font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all hover:shadow-[0_0_25px_rgba(217,119,6,0.5)] flex items-center justify-center group"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                    Register & Claim 1,000 Coins
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

        </div>
      </DialogContent>
    </Dialog>
  );
}