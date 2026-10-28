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
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

export const ReportsPage = () => {
  const [downloadingType, setDownloadingType] = useState(null);
  const toast = useToast();

  const downloadReport = async (type, title) => {
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
      toast.success(`${title} downloaded successfully as CSV`);
    } catch (err) {
      toast.error(err.message || 'Failed to export report CSV');
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
      category: 'Asset Management',
    },
    {
      id: 'subscriptions',
      title: 'Subscription Status & Renewals Report',
      description: 'Active, trial, expiring, and cancelled subscriptions with next renewal dates and billing cadence.',
      icon: CreditCard,
      category: 'SaaS Contracts',
    },
    {
      id: 'expenses',
      title: 'Verified Expense & Expenditure Report',
      description: 'Granular log of all confirmed invoices, paid receipts, payment methods, and historical vendor spend.',
      icon: Receipt,
      category: 'Financial Actuals',
    },
    {
      id: 'allocations',
      title: 'Project Cost Allocation Report',
      description: 'Cross-project cost attribution matrix ensuring 100% cap safety and avoiding double-counting.',
      icon: Share2,
      category: 'Cost Accounting',
    },
    {
      id: 'api-credits',
      title: 'API Credit & Token Quota Audit',
      description: 'Provider balances, sync status, reported vs estimated quotas, and low-balance threshold breaches.',
      icon: Cpu,
      category: 'Infrastructure Telemetry',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Data Export"
        description="Generate on-demand CSV exports and comprehensive compliance audits across digital resources, expenses, and project cost allocations."
        breadcrumbs={[{ label: 'Reports' }]}
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {reports.length} report templates
          </Badge>
        }
      />

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((rep) => {
          const Icon = rep.icon;
          const isDownloading = downloadingType === rep.id;

          return (
            <Card key={rep.id} className="flex flex-col justify-between hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {rep.category}
                  </Badge>
                </div>
                <div className="pt-2">
                  <CardTitle className="text-base font-bold text-foreground">{rep.title}</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rep.description}
                </p>

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 justify-center"
                    isLoading={isDownloading}
                    onClick={() => downloadReport(rep.id, rep.title)}
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
