"use client";
import { useState, useEffect } from "react";
import { Send, History, FileText, Plus, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import api from "@/app/lib/apiConfig";
import { formatDistanceToNow } from "date-fns";

interface NotificationRecord { id: string; title: string; body: string; targetType: string; sentAt: string; status: string; sender?: { username: string }; }
interface Template { id: string; name: string; title: string; body: string; }

const TARGET_OPTIONS = [
    { value: "all", label: "Everyone" },
    { value: "players", label: "All Players" },
    { value: "partners", label: "All Partners" },
    { value: "tier:PRO", label: "PRO Partners" },
    { value: "tier:ENTERPRISE", label: "Enterprise Partners" },
];

export default function PushNotificationsSection() {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [targetType, setTargetType] = useState("all");
    const [sending, setSending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const [history, setHistory] = useState<NotificationRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [templates, setTemplates] = useState<Template[]>([]);
    const [newTmplName, setNewTmplName] = useState("");
    const [newTmplTitle, setNewTmplTitle] = useState("");
    const [newTmplBody, setNewTmplBody] = useState("");
    const [savingTemplate, setSavingTemplate] = useState(false);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get("/admin/notifications/history");
            setHistory(res.data.notifications);
        } catch { /* silent */ }
        finally { setHistoryLoading(false); }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get("/admin/notifications/templates");
            setTemplates(res.data.templates);
        } catch { /* silent */ }
    };

    useEffect(() => { fetchHistory(); fetchTemplates(); }, []);

    const applyTemplate = (t: Template) => { setTitle(t.title); setBody(t.body); };

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) return toast({ title: "Missing fields", description: "Title and message are required.", variant: "destructive" });
        setSending(true);
        try {
            await api.post("/admin/notifications/send", { title, body, targetType });
            toast({ title: "Notification sent!", description: `Delivered to: ${TARGET_OPTIONS.find(o => o.value === targetType)?.label}` });
            setTitle(""); setBody("");
            fetchHistory();
        } catch { toast({ title: "Error", description: "Failed to send notification.", variant: "destructive" }); }
        finally { setSending(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/admin/notifications/${id}`);
            setHistory(prev => prev.filter(n => n.id !== id));
        } catch { toast({ title: "Error", description: "Failed to delete notification.", variant: "destructive" }); }
    };

    const handleSaveTemplate = async () => {
        if (!newTmplName || !newTmplTitle || !newTmplBody) return;
        setSavingTemplate(true);
        try {
            await api.post("/admin/notifications/templates", { name: newTmplName, title: newTmplTitle, body: newTmplBody });
            setNewTmplName(""); setNewTmplTitle(""); setNewTmplBody("");
            fetchTemplates();
            toast({ title: "Template saved" });
        } catch { toast({ title: "Error", description: "Template name may already exist.", variant: "destructive" }); }
        finally { setSavingTemplate(false); }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await api.delete(`/admin/notifications/templates/${id}`);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch { /* silent */ }
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="compose">
                <TabsList className="bg-black/20">
                    <TabsTrigger value="compose"><Send className="mr-2 h-3.5 w-3.5" />Compose</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2 h-3.5 w-3.5" />History</TabsTrigger>
                    <TabsTrigger value="templates"><FileText className="mr-2 h-3.5 w-3.5" />Templates</TabsTrigger>
                </TabsList>

                {/* Compose */}
                <TabsContent value="compose" className="space-y-4 mt-4">
                    {templates.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {templates.map(t => (
                                <Button key={t.id} variant="outline" size="sm" className="text-xs border-white/10 hover:bg-white/10" onClick={() => applyTemplate(t)}>
                                    {t.name}
                                </Button>
                            ))}
                        </div>
                    )}
                    <div className="grid gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Target Audience</label>
                            <Select value={targetType} onValueChange={setTargetType}>
                                <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>{TARGET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Title</label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." className="bg-black/20 border-white/10" maxLength={100} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Message</label>
                            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." className="bg-black/20 border-white/10 resize-none" rows={4} maxLength={500} />
                            <p className="text-xs text-muted-foreground text-right">{body.length}/500</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="border-white/10" onClick={() => setPreviewOpen(true)} disabled={!title || !body}>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </Button>
                            <Button onClick={handleSend} disabled={sending || !title || !body} className="flex-1">
                                {sending ? "Sending..." : <><Send className="mr-2 h-4 w-4" />Send to {TARGET_OPTIONS.find(o => o.value === targetType)?.label}</>}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="mt-4">
                    {historyLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : history.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No notifications sent yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map(n => (
                                <div key={n.id} className="flex items-start justify-between gap-4 p-4 rounded-lg bg-black/20 border border-white/5">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{n.title}</p>
                                        <p className="text-sm text-muted-foreground truncate">{n.body}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10">{TARGET_OPTIONS.find(o => o.value === n.targetType)?.label ?? n.targetType}</Badge>
                                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0" onClick={() => handleDelete(n.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Templates */}
                <TabsContent value="templates" className="mt-4 space-y-4">
                    <Card className="border-white/10 bg-black/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Create Template</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input value={newTmplName} onChange={e => setNewTmplName(e.target.value)} placeholder="Template name (e.g. 'Tournament Alert')" className="bg-black/20 border-white/10" />
                            <Input value={newTmplTitle} onChange={e => setNewTmplTitle(e.target.value)} placeholder="Notification title" className="bg-black/20 border-white/10" />
                            <Textarea value={newTmplBody} onChange={e => setNewTmplBody(e.target.value)} placeholder="Notification body" className="bg-black/20 border-white/10 resize-none" rows={3} />
                            <Button size="sm" onClick={handleSaveTemplate} disabled={savingTemplate || !newTmplName || !newTmplTitle || !newTmplBody}>
                                <Plus className="mr-2 h-3.5 w-3.5" /> Save Template
                            </Button>
                        </CardContent>
                    </Card>

                    {templates.map(t => (
                        <div key={t.id} className="flex items-start justify-between p-4 rounded-lg bg-black/20 border border-white/5">
                            <div>
                                <p className="font-medium text-sm">{t.name}</p>
                                <p className="text-sm text-muted-foreground">{t.title}</p>
                                <p className="text-xs text-muted-foreground/60 truncate max-w-xs">{t.body}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteTemplate(t.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </TabsContent>
            </Tabs>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
                    <div className="p-4 rounded-lg bg-black/30 border border-white/10 space-y-2">
                        <p className="font-semibold text-sm">{title}</p>
                        <p className="text-sm text-muted-foreground">{body}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button>
                        <Button onClick={() => { setPreviewOpen(false); handleSend(); }}>Send Now</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
