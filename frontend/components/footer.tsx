import Link from "next/link"
import { Github, Twitter } from "lucide-react"

import { Button } from "@/components/ui/button"

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    className={className}
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
)

export function Footer() {
  return (
    <footer className="border-t bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/20 mt-12">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12">
          {/* Brand & Social */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold tracking-tighter gradient-text">TesticTour</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The premier tournament platform for Teamfight Tactics players. Join competitions, track your performance, and climb the leaderboards.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="icon" asChild className="hover:bg-[#5865F2] hover:text-white transition-colors">
                <Link href="https://discord.com/invite/R3rez3qDbf" target="_blank" rel="noreferrer">
                  <DiscordIcon className="h-5 w-5" />
                  <span className="sr-only">Discord Community</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="https://twitter.com" target="_blank" rel="noreferrer">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="https://github.com" target="_blank" rel="noreferrer">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-foreground">Platform</h2>
            <Link href="/tournaments" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tournaments</Link>
            <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Leaderboards</Link>
            <Link href="/players" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Players</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-foreground">Community & Partners</h2>
            <Link href="/organize" className="text-sm text-[#D4B263] hover:text-[#f4d17f] transition-colors font-medium">Partner Program</Link>
            <Link href="https://discord.com/invite/R3rez3qDbf" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Join Discord</Link>
            <Link href="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers / Jobs</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-foreground">Legal</h2>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col gap-6">
          {/* Riot API Disclaimer */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Powered by Riot API
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
              TesticTour isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} TesticTour. All rights reserved.
            </p>
            <p>
              Built for the TFT Community.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
