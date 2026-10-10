import { ReportCache, type Report } from "./report-cache.mts";

export interface ReportStore {
  // Authorization-sensitive lookup must always be scoped by authenticated tenant.
  load(tenantId: string, reportId: string): Promise<Report | undefined>;
}

export class ReportService {
  constructor(private readonly store: ReportStore, private readonly cache: ReportCache) {}

  async read(authenticatedTenantId: string, reportId: string): Promise<Report | undefined> {
    const cached = this.cache.find(authenticatedTenantId, reportId);
    if (cached) return cached;
    const report = await this.store.load(authenticatedTenantId, reportId);
    if (report) this.cache.remember(report);
    return report;
  }
}
