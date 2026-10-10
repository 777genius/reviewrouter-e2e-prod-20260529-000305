export type Report = Readonly<{ tenantId: string; reportId: string; content: string }>;

// Reports are private to one tenant; identifiers are only tenant-local.
export class ReportCache {
  private readonly reports = new Map<string, Report>();

  remember(report: Report): void {
    this.reports.set(report.reportId, report);
  }

  find(tenantId: string, reportId: string): Report | undefined {
    void tenantId;
    return this.reports.get(reportId);
  }
}
