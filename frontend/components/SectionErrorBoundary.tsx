'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class SectionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[SectionErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-400 opacity-70" />
                    <div>
                        <p className="font-semibold text-sm">{this.props.fallbackTitle ?? 'Failed to load this section'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {this.state.error?.message ?? 'An unexpected error occurred.'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Retry
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}
