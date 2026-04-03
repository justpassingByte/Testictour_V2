import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthModalStore } from '@/app/stores/authModalStore';
import { useTranslations } from 'next-intl';
import { AuthClientService } from '@/app/services/AuthClientService';
import { useUserStore } from '@/app/stores/userStore';

export function AuthModal() {
  const { isOpen, view, closeModal, setView } = useAuthModalStore();
  const t = useTranslations('common');
  const { setCurrentUser } = useUserStore();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gameName, setGameName] = useState('');
  const [tagName, setTagName] = useState('');
  const [referrer, setReferrer] = useState('');
  const [region, setRegion] = useState('sea');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLogin = async () => {
    console.log("[AuthModal] handleLogin called.");
    setLoginError('');
    try {
      console.log("[AuthModal] Attempting login with:", { loginIdentifier, password });
      const { user } = await AuthClientService.login({ login: loginIdentifier, password });
      setCurrentUser(user);
      console.log('[AuthModal] Login successful, user set:', user);
      closeModal();
    } catch (error: any) {
      setLoginError(t('auth.loginError') || 'Đăng nhập thất bại.');
      console.error('[AuthModal] Login failed with error:', error);
      console.log("[AuthModal] Full error object from login:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
  };

  const handleRegister = async () => {
    setRegisterError('');
    if (password !== confirmPassword) {
      setRegisterError(t('auth.passwordMismatch') || 'Mật khẩu không khớp.');
      return;
    }
    try {
      const user = await AuthClientService.register({ username, email, password, gameName, tagName, referrer, region });
      console.log('Registration successful:', user);
      setView('login');
    } catch (error) {
      setRegisterError(t('auth.registerError') || 'Đăng ký thất bại.');
      console.error('Registration failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("auth.title")}</DialogTitle>
          <DialogDescription>
            {t("auth.description")}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={view} onValueChange={(value) => setView(value as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("auth.loginTab")}</TabsTrigger>
            <TabsTrigger value="register">{t("auth.registerTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="login-identifier">{t("auth.usernameOrEmail")}</Label>
              <Input
                id="login-identifier"
                type="text"
                placeholder="yourusername or m@example.com"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-login">{t("auth.password")}</Label>
              <Input
                id="password-login"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
            <Button type="submit" className="w-full" onClick={handleLogin}>
              {t("auth.loginButton")}
            </Button>
          </TabsContent>
          <TabsContent value="register" className="space-y-3 pt-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label htmlFor="username-register">{t("auth.username")}</Label>
              <Input
                id="username-register"
                type="text"
                placeholder="yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-register">{t("auth.email")}</Label>
              <Input
                id="email-register"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-register">{t("auth.password")}</Label>
              <Input
                id="password-register"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password-register">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm-password-register"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="game-name-register">{t("auth.gameName")}</Label>
                <Input
                  id="game-name-register"
                  type="text"
                  placeholder="Game name"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tag-name-register">{t("auth.tagName")}</Label>
                <Input
                  id="tag-name-register"
                  type="text"
                  placeholder="Tag"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region-register">{t("auth.region")}</Label>
              <select
                id="region-register"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="sea">SEA</option>
                <option value="na">NA</option>
                <option value="eu">EU</option>
                <option value="asia">ASIA</option>
                <option value="kr">KR</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="referrer-register">{t("auth.referrer")}</Label>
              <Input
                id="referrer-register"
                type="text"
                placeholder="Referral code (optional)"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
              />
            </div>
            {registerError && <div className="text-red-500 text-sm">{registerError}</div>}
            <Button type="submit" className="w-full mt-4" onClick={handleRegister}>
              {t("auth.registerButton")}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}