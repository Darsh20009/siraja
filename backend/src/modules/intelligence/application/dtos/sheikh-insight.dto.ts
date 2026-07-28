import { ApiProperty } from '@nestjs/swagger';
import { IntelligenceRecommendationDto } from './recommendation.dto';

class StudentBriefDto {
  @ApiProperty()
  studentId: string;
  @ApiProperty({ minimum: 0, maximum: 100 })
  memorizationScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  revisionScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  attendanceScore: number;
  @ApiProperty({ minimum: 0, maximum: 100 })
  consistencyScore: number;
  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  forgettingRisk: string;
  @ApiProperty({ minimum: 0, maximum: 100 })
  difficultyIndex: number;
  @ApiProperty()
  totalAyahsMemorized: number;
  @ApiProperty()
  overdueRevisionCount: number;
  @ApiProperty()
  openMistakes: number;
  @ApiProperty({ type: [IntelligenceRecommendationDto] })
  topRecommendations: IntelligenceRecommendationDto[];
}

class ClassAggregateDto {
  @ApiProperty()
  averageMemorizationScore: number;
  @ApiProperty()
  averageRevisionScore: number;
  @ApiProperty()
  averageAttendanceScore: number;
  @ApiProperty()
  averageDifficultyIndex: number;
  @ApiProperty()
  classRetentionRate: number;
  @ApiProperty()
  studentsWithHighForgettingRisk: number;
  @ApiProperty()
  studentsWithLowAttendance: number;
  @ApiProperty()
  totalOpenMistakes: number;
}

export class SheikhInsightDto {
  @ApiProperty()
  sheikhId: string;
  @ApiProperty({ description: 'ISO date-time when insights were generated' })
  generatedAt: string;
  @ApiProperty()
  totalStudents: number;
  @ApiProperty({ type: [StudentBriefDto] })
  students: StudentBriefDto[];
  @ApiProperty({ type: [String], description: 'Top 3 performing student IDs' })
  topPerformers: string[];
  @ApiProperty({ type: [String], description: 'Student IDs with high-priority risk flags' })
  needsAttention: string[];
  @ApiProperty({ type: ClassAggregateDto })
  classAggregate: ClassAggregateDto;
}
