import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToSignupSession1704067200000 implements MigrationInterface {
  name = 'AddPhoneToSignupSession1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signup_sessions" ADD "phone" varchar(20)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signup_sessions" DROP COLUMN "phone"`
    );
  }
}
