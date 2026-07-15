import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DonationsService, DEFAULT_STAGES } from './donations.service';
import { DONATION_CAMPAIGN_REPOSITORY } from '../../domain/repositories/donation-campaign.repository.interface';
import { DONATION_REPOSITORY } from '../../domain/repositories/donation.repository.interface';
import { DonationStatus, CampaignStatus } from '@shared/enums/admin-operations.enum';
import { EVENTS } from '@shared/events/events.constants';

const mockCampaignRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findPublicActive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  incrementRaised: jest.fn(),
  delete: jest.fn(),
});

const mockDonationRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCampaign: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  sumConfirmedByCampaign: jest.fn(),
  countByCampaign: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

describe('DonationsService', () => {
  let service: DonationsService;
  let campaignRepo: ReturnType<typeof mockCampaignRepo>;
  let donationRepo: ReturnType<typeof mockDonationRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: DONATION_CAMPAIGN_REPOSITORY, useFactory: mockCampaignRepo },
        { provide: DONATION_REPOSITORY, useFactory: mockDonationRepo },
        { provide: EventEmitter2, useFactory: mockEmitter },
      ],
    }).compile();

    service = module.get(DonationsService);
    campaignRepo = module.get(DONATION_CAMPAIGN_REPOSITORY);
    donationRepo = module.get(DONATION_REPOSITORY);
    emitter = module.get(EventEmitter2);
  });

  describe('listCampaigns', () => {
    it('passes status filter to repository', () => {
      campaignRepo.findAll.mockResolvedValue([]);
      service.listCampaigns(CampaignStatus.ACTIVE);
      expect(campaignRepo.findAll).toHaveBeenCalledWith({ status: CampaignStatus.ACTIVE });
    });

    it('passes undefined when no status given', () => {
      campaignRepo.findAll.mockResolvedValue([]);
      service.listCampaigns();
      expect(campaignRepo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getCampaignById', () => {
    it('throws NotFoundException when campaign not found', async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(service.getCampaignById('abc')).rejects.toThrow(NotFoundException);
    });

    it('enriches campaign with donor count and raised amount', async () => {
      const campaign = { stages: [], raisedAmount: 0 };
      campaignRepo.findById.mockResolvedValue(campaign);
      donationRepo.countByCampaign.mockResolvedValue(5);
      donationRepo.sumConfirmedByCampaign.mockResolvedValue(1000);

      const result = await service.getCampaignById('abc');
      expect(result.donorCount).toBe(5);
      expect(result.raisedAmount).toBe(1000);
      expect(result.stages).toHaveLength(DEFAULT_STAGES.length);
    });

    it('marks a stage as completed when raisedAmount exceeds target', async () => {
      const campaign = { stages: [], raisedAmount: 0 };
      campaignRepo.findById.mockResolvedValue(campaign);
      donationRepo.countByCampaign.mockResolvedValue(1);
      donationRepo.sumConfirmedByCampaign.mockResolvedValue(6000);

      const result = await service.getCampaignById('abc');
      expect(result.stages[0].completed).toBe(true);  // stage 1 target = 5000
      expect(result.stages[1].completed).toBe(false); // stage 2 target = 15000
    });
  });

  describe('submitDonation', () => {
    it('throws NotFoundException when campaign not found', async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(service.submitDonation({ campaignId: 'x', amount: 100 })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when campaign is not active', async () => {
      campaignRepo.findById.mockResolvedValue({ status: CampaignStatus.PAUSED });
      await expect(service.submitDonation({ campaignId: 'x', amount: 100 })).rejects.toThrow(BadRequestException);
    });

    it('creates donation and emits DONATION_CREATED event', async () => {
      campaignRepo.findById.mockResolvedValue({ status: CampaignStatus.ACTIVE });
      donationRepo.create.mockResolvedValue({ _id: 'don1', amount: 100 });

      await service.submitDonation({ campaignId: 'camp1', amount: 100 });

      expect(donationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 100,
        status: DonationStatus.PENDING,
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.DONATION_CREATED, expect.objectContaining({
        campaignId: 'camp1',
        amount: 100,
      }));
    });

    it('sets isAnonymous true when no donorUserId provided', async () => {
      campaignRepo.findById.mockResolvedValue({ status: CampaignStatus.ACTIVE });
      donationRepo.create.mockResolvedValue({ _id: 'd1' });

      await service.submitDonation({ campaignId: 'c1', amount: 50 });
      expect(donationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });
  });

  describe('confirmDonation', () => {
    it('throws NotFoundException when donation not found', async () => {
      donationRepo.findById.mockResolvedValue(null);
      await expect(service.confirmDonation('x', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when donation is not pending', async () => {
      donationRepo.findById.mockResolvedValue({ status: DonationStatus.CONFIRMED, campaignId: 'c1', amount: 100 });
      await expect(service.confirmDonation('x', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('updates status to CONFIRMED and increments campaign raised amount', async () => {
      const donation = { status: DonationStatus.PENDING, campaignId: { toString: () => 'c1' }, amount: 200 };
      donationRepo.findById.mockResolvedValue(donation);
      donationRepo.update.mockResolvedValue({ ...donation, status: DonationStatus.CONFIRMED });
      campaignRepo.incrementRaised.mockResolvedValue(undefined);

      await service.confirmDonation('don1', 'admin1');

      expect(donationRepo.update).toHaveBeenCalledWith('don1', expect.objectContaining({
        status: DonationStatus.CONFIRMED,
      }));
      expect(campaignRepo.incrementRaised).toHaveBeenCalledWith('c1', 200);
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.DONATION_CONFIRMED, expect.any(Object));
    });
  });

  describe('getFundraisingProgress', () => {
    it('marks stages completed correctly', () => {
      const result = service.getFundraisingProgress(16000);
      expect(result.stages[0].completed).toBe(true);  // 5000
      expect(result.stages[1].completed).toBe(true);  // 15000
      expect(result.stages[2].completed).toBe(false); // 30000
    });

    it('reports the first incomplete stage as currentStage', () => {
      const result = service.getFundraisingProgress(16000);
      expect(result.currentStage.stageNumber).toBe(3);
    });
  });
});
