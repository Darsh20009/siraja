import { Injectable, Inject } from '@nestjs/common';
import { DONATION_REPOSITORY, IDonationRepository } from '../../domain/repositories/donation.repository.interface';
import { DONATION_CAMPAIGN_REPOSITORY, IDonationCampaignRepository } from '../../domain/repositories/donation-campaign.repository.interface';
import { OPERATIONAL_SNAPSHOT_REPOSITORY, IOperationalSnapshotRepository } from '../../domain/repositories/operational-snapshot.repository.interface';
import { DonationsService, DEFAULT_STAGES } from './donations.service';

const PLATFORM_DATA = {
  name: 'سراجة — Siraja',
  tagline: 'منصة تحفيظ القرآن الكريم الذكية',
  mission: 'تمكين كل حلقة تحفيظ من أدوات رقمية متكاملة لمتابعة الطلاب وتحفيزهم على ختم كتاب الله.',
  vision: 'أن نكون المنصة الرائدة في العالم الإسلامي لخدمة مجالس القرآن الكريم.',
  features: [
    { key: 'memorization',  label: 'نظام تحفيظ ومراجعة متكامل', description: 'تسجيل الحصص، تتبع التقدم، وإدارة الأخطاء.' },
    { key: 'ai',           label: 'ذكاء اصطناعي تعليمي',         description: 'تحليل نقاط الضعف وتقديم توصيات مخصصة.' },
    { key: 'gamification', label: 'نظام نقاط ومكافآت',           description: 'تحفيز الطلاب بشارات وإنجازات ولوحات صدارة.' },
    { key: 'analytics',    label: 'تقارير وتحليلات',             description: 'رؤى عميقة لأداء كل طالب وحلقة.' },
    { key: 'communication',label: 'تواصل متكامل',                description: 'رسائل وإعلانات وإشعارات للأسر والمشرفين.' },
    { key: 'smart_mushaf', label: 'مصحف ذكي',                    description: 'تتبع الأداء على مستوى كل آية مع خريطة حرارية.' },
  ],
  roadmap: [
    { phase: '12A', title: 'أساسيات المنصة',    status: 'completed' },
    { phase: '12B', title: 'ذكاء التعلم',        status: 'completed' },
    { phase: '12C', title: 'البنية التحتية',      status: 'completed' },
    { phase: '12D', title: 'التلعيب والمكافآت',  status: 'completed' },
    { phase: '12E', title: 'الإدارة والنمو',      status: 'completed' },
    { phase: '13',  title: 'تطبيق الجوال',        status: 'planned' },
    { phase: '14',  title: 'الشبكة الإسلامية',   status: 'planned' },
  ],
  successMetrics: [
    { metric: 'student_retention', label: 'معدل استمرار الطلاب',  target: '85%' },
    { metric: 'daily_active',      label: 'نشاط يومي',             target: '70% من المسجلين' },
    { metric: 'memorization_rate', label: 'معدل الحفظ الأسبوعي', target: 'صفحة يومياً لكل طالب' },
    { metric: 'nps',               label: 'رضا المستخدمين (NPS)', target: '> 60' },
  ],
  donationMilestones: DEFAULT_STAGES.map(s => ({
    stageNumber: s.stageNumber,
    label: s.label,
    targetAmount: s.targetAmount,
    targetAmountFormatted: `${(s.targetAmount / 1000).toFixed(0)}K SAR`,
  })),
  testimonials: [
    {
      id: 'tm1',
      name: 'أم خالد',
      role: 'ولية أمر طالبة',
      body: 'منذ استخدمنا سراجة تحسّن حفظ ابنتي بشكل ملحوظ، وأصبحت أتابع تقدمها يومياً من جوالي.',
      rating: 5,
    },
    {
      id: 'tm2',
      name: 'الشيخ محمد العمري',
      role: 'مشرف حلقة تحفيظ',
      body: 'النظام وفّر علينا ساعات من العمل الورقي وأعطانا رؤية واضحة لمستوى كل طالب.',
      rating: 5,
    },
    {
      id: 'tm3',
      name: 'أ. سارة الغامدي',
      role: 'مشرفة تربوية',
      body: 'أحب ميزة المصحف الذكي — الخريطة الحرارية تُظهر لنا بالضبط أين يحتاج كل طالب مراجعة إضافية.',
      rating: 5,
    },
    {
      id: 'tm4',
      name: 'عبدالرحمن، 14 عاماً',
      role: 'طالب تحفيظ',
      body: 'النقاط والشارات تجعلني أتنافس مع زملائي بطريقة ممتعة، وأصبحت أحرص على حضور كل حصة.',
      rating: 5,
    },
  ],
};

@Injectable()
export class PresentationService {
  constructor(
    @Inject(DONATION_REPOSITORY) private readonly donationRepo: IDonationRepository,
    @Inject(DONATION_CAMPAIGN_REPOSITORY) private readonly campaignRepo: IDonationCampaignRepository,
    @Inject(OPERATIONAL_SNAPSHOT_REPOSITORY) private readonly snapshotRepo: IOperationalSnapshotRepository,
    private readonly donationsService: DonationsService,
  ) {}

  async getPresentationData() {
    const [latestSnapshot, activeCampaigns] = await Promise.all([
      this.snapshotRepo.findLatest(),
      this.campaignRepo.findPublicActive(),
    ]);

    const primaryCampaign = activeCampaigns[0];
    const fundraising = primaryCampaign
      ? this.donationsService.getFundraisingProgress(primaryCampaign.raisedAmount)
      : {
          raisedAmount: 5000,
          stages: DEFAULT_STAGES.map(s => ({
            ...s,
            completed: 5000 >= s.targetAmount,
            progressPercent: Math.min(100, Math.round((5000 / s.targetAmount) * 100)),
          })),
          currentStage: DEFAULT_STAGES[1],
        };

    return {
      ...PLATFORM_DATA,
      stats: {
        totalStudents: latestSnapshot?.totalStudents ?? 0,
        totalSheikhs: latestSnapshot?.totalSheikhs ?? 0,
        totalTenants: latestSnapshot?.totalTenants ?? 0,
        dailyMemorizationRecords: latestSnapshot?.dailyMemorizationRecords ?? 0,
      },
      fundraising: {
        ...fundraising,
        milestones: PLATFORM_DATA.donationMilestones.map(m => ({
          ...m,
          completed: fundraising.raisedAmount >= m.targetAmount,
          progressPercent: Math.min(100, Math.round((fundraising.raisedAmount / m.targetAmount) * 100)),
        })),
        activeCampaign: primaryCampaign
          ? {
              id: (primaryCampaign as any)._id?.toString(),
              name: primaryCampaign.name,
              targetAmount: primaryCampaign.targetAmount,
            }
          : null,
      },
    };
  }

  getMission()        { return { mission: PLATFORM_DATA.mission, vision: PLATFORM_DATA.vision }; }
  getFeatures()       { return PLATFORM_DATA.features; }
  getRoadmap()        { return PLATFORM_DATA.roadmap; }
  getSuccessMetrics() { return PLATFORM_DATA.successMetrics; }
  getTestimonials()   { return PLATFORM_DATA.testimonials; }
  getDonationMilestones() { return PLATFORM_DATA.donationMilestones; }
}
