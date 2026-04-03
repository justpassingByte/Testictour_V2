"use client"
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from '@/app/lib/apiConfig';
import { useAdminUserStore } from '@/app/stores/adminUserStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, FileCheck, FileX } from 'lucide-react';

interface UserImportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UserImportModal({ open, onClose }: UserImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ successfulImports: any[], failedImports: any[] } | null>(null);
  const [referrer, setReferrer] = useState<string>('');
  const fetchUsers = useAdminUserStore((state) => state.fetchUsers);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setUploadResult(null); // Reset result when a new file is selected
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (referrer) {
      formData.append('referrer', referrer);
    }

    try {
      const response = await api.post('/admin/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResult(response.data.result);
      fetchUsers(); // Refresh the user list after import
    } catch (error) {
      console.error("Upload failed", error);
      setUploadResult({ successfulImports: [], failedImports: [{ username: 'File Upload Error', reason: 'Could not upload the file to the server.' }] });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleClose = () => {
    setFile(null);
    setUploadResult(null);
    setReferrer('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Users from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) with columns: tên ingame (or username), tagname, and coin (or balance). Optionally, provide a referrer for all imported accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="excel-file">Excel File</Label>
            <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="referrer">Referrer (Optional)</Label>
            <Input
              id="referrer"
              type="text"
              placeholder="Enter referrer username or ID"
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
            />
          </div>

          {uploadResult && (
            <div className="max-h-60 overflow-y-auto space-y-4">
              {uploadResult.successfulImports.length > 0 && (
                <Alert variant="default">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-600">Successfully Imported ({uploadResult.successfulImports.length})</AlertTitle>
                  <AlertDescription>
                     <ul className="list-disc pl-5 text-xs">
                       {uploadResult.successfulImports.map((item, index) => (
                         <li key={index}>
                           {item.username} - Email: {item.email} - Pass: {item.password}
                         </li>
                       ))}
                     </ul>
                  </AlertDescription>
                </Alert>
              )}
              {uploadResult.failedImports.length > 0 && (
                 <Alert variant="destructive">
                   <FileX className="h-4 w-4" />
                   <AlertTitle>Failed Imports ({uploadResult.failedImports.length})</AlertTitle>
                   <AlertDescription>
                     <ul className="list-disc pl-5 text-xs">
                       {uploadResult.failedImports.map((item, index) => (
                         <li key={index}>
                           {item.username}: {item.reason}
                         </li>
                       ))}
                     </ul>
                   </AlertDescription>
                 </Alert>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload and Import'}
            <UploadCloud className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 