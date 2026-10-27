import React, { useState } from 'react';
import {
  FileBarChart2,
  Download,
  Server,
  CreditCard,
  Receipt,
  Cpu,
  Share2,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export const ReportsPage = () => {
  const [downloadingType, setDownloadingType] = useState(null);

  const downloadReport = async (type) => {
    try {
      setDownloadingType(type);
      const response = await api.get(`/reports/export/${type}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ersms-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Failed to export report', err);
    } finally {
      setDownloadingType(null);
    }
  };

  const reports = [
    {
      id: 'resources',
      title: 'Digital Resource Inventory Report',
      description: 'Complete breakdown of all enterprise cloud servers, SaaS accounts, domains, owners, and costs.',
      icon: Server,
      color: 'text-blue-500',
    },
    {
      id: 'subscriptions',
      title: 'Subscription Status & Renewals Report',
      description: 'Active, trial, expiring, and cancelled subscriptions with next renewal dates and billing cadence.',
      icon: CreditCard,
      color: 'text-emerald-500',
    },
    {
      id: 'expenses',
      title: 'Verified Expense & Expenditure Report',
      description: 'Historical verified payments with invoice numbers, payment status, and cost centers.',
      icon: Receipt,
      color: 'text-amber-500',
    },
    {
      id: 'api-credits',
      title: 'API Credits & Quota Health Report',
      description: 'Multi-unit balances (Tokens, Requests, USD Cents) across all provider accounts.',
      icon: Cpu,
      color: 'text-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Enterprise Reporting & Export</h1>
        <p className="text-sm text-muted-foreground">
          Export verified operational and financial data in standard CSV format for external auditing and analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <report.icon className={`h-5 w-5 ${report.color}`} />
                </div>
                <Badge variant="outline">CSV Export</Badge>
              </div>
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">{report.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                variant="outline"
                className="w-full gap-2 text-xs"
                isLoading={downloadingType === report.id}
                onClick={() => downloadReport(report.id)}
              >
                <Download className="h-4 w-4" />
                <span>Export CSV Report</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

