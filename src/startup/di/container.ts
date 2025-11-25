// Import Infra
import { Container } from 'inversify';
import { Logger } from '../logger';


// Import Controllers
import { AuthController } from '../../application/auth/auth.controller'; 
import { UserController } from '../../application/users/users.controller';
import { ExamsController } from '../../application/exams/exams.controller';
import { UtilsController } from '../../application/utils/utils.controller';
import { PracticeController } from '../../application/practice/practice.controller';
import { ProfileController } from '../../application/profile/profile.controller';
import { DashboardController } from '../../application/dashboard/dashboard.controller';
import { PaymentsController } from '../../application/payments/payments.controller';
import { SubscriptionsController } from '../../application/subscriptions/subscriptions.controller';
import { ReferralsController } from '../../application/referrals/referrals.controller';


// Import Services
import { AuthService } from '../../application/auth/auth.service'; 
import { UserService } from '../../application/users/users.service';
import { ExamsService } from '../../application/exams/exams.service';
import { PracticeService } from '../../application/practice/practice.service';
import { ProfileService } from '../../application/profile/profile.service';
import { DashboardService } from '../../application/dashboard/dashboard.service';
import { PaymentsService } from '../../application/payments/payments.service';
import { SubscriptionService } from '../../application/subscriptions/subscriptions.service';
import { ReferralsService } from '../../application/referrals/referrals.service';


// import { UserService } from '../../features/users/service/user.service';

//Email Service
import { MailtrapEmailService } from '../../helpers/email/mailtrap.helper';
import { ResendEmailService } from '../../helpers/email/resend.helper';
import { PostmarkEmailService } from '../../helpers/email/postmark.helper';


// Import Models
import { UserModel } from '../../application/users/models/user.model';
import { UserSubscriptionsModel } from '../../application/users/models/user_subscriptions.model';
import { ExamModel } from '../../application/exams/models/exams.model';
import { ExamEnrollmentModel } from '../../application/exams/models/exam_enrollment.model';
import { ExamScenariosModel } from '../../application/exams/models/exam_scenarios.model';
import { ExamSubscriptionsModel } from '../../application/exams/models/exam_subscriptions.model';
import { PracticeModel } from '../../application/practice/models/practice.model';
import { PracticeLogsModel } from '../../application/practice/models/practice_logs.model';
// import { TransactionsModel } from '../../application/payments/models/transactions.model';
import { PaymentsModel } from '../../application/payments/models/payments.models';
import { PaymentMethodModel } from '../../application/payments/models/payment_methods.models';
import { PaymentPlansModel } from '../../application/payments/models/payment_plans.model';
import { SubscriptionsModel } from '../../application/subscriptions/models/subscriptions.model';
import { UserActivityLogModel } from '../../application/activity/models/activity_logs.model';
import { ReferralsModel } from '../../application/referrals/models/referrals.model';
import { ReferralPayoutsModel } from '../../application/referrals/models/referral_payouts.model';


// Repositories
import { UserRepository } from '../../application/users/models/user.repository';
import { ExamsRepository } from '../../application/exams/models/exams.repository';
import { PracticeRepository } from '../../application/practice/models/practice.repository';
import { DashboardRepository } from '../../application/dashboard/models/dashboard.repository';
import { PaymentsRepository } from '../../application/payments/models/payments.repository';
import { SubscriptionRepository } from '../../application/subscriptions/models/subscriptions.repository';
import { ReferralsRepository } from '../../application/referrals/models/referrals.repository';



const container = new Container();

// Infrastructure
// container.bind<DatabaseClient>(DatabaseClient).toSelf().inSingletonScope();
container.bind<Logger>(Logger).toSelf().inSingletonScope();

// Controllers
container.bind<AuthController>(AuthController).toSelf();
container.bind<UserController>(UserController).toSelf();
container.bind<ExamsController>(ExamsController).toSelf();
container.bind<UtilsController>(UtilsController).toSelf();
container.bind<PracticeController>(PracticeController).toSelf();
container.bind<ProfileController>(ProfileController).toSelf();
container.bind<DashboardController>(DashboardController).toSelf();
container.bind<PaymentsController>(PaymentsController).toSelf();
container.bind<SubscriptionsController>(SubscriptionsController).toSelf();
container.bind<ReferralsController>(ReferralsController).toSelf();


// Services
container.bind<AuthService>(AuthService).toSelf();
container.bind<UserService>(UserService).toSelf();
container.bind<ExamsService>(ExamsService).toSelf();
container.bind<PracticeService>(PracticeService).toSelf();
container.bind<ProfileService>(ProfileService).toSelf();
container.bind<DashboardService>(DashboardService).toSelf();
container.bind<PaymentsService>(PaymentsService).toSelf();
container.bind<SubscriptionService>(SubscriptionService).toSelf();
container.bind<ReferralsService>(ReferralsService).toSelf();



// Repositories, Query Sources
container.bind<UserRepository>(UserRepository).toSelf();
container.bind<ExamsRepository>(ExamsRepository).toSelf();
container.bind<PracticeRepository>(PracticeRepository).toSelf();
container.bind<DashboardRepository>(DashboardRepository).toSelf();
container.bind<PaymentsRepository>(PaymentsRepository).toSelf();
container.bind<SubscriptionRepository>(SubscriptionRepository).toSelf();
container.bind<ReferralsRepository>(ReferralsRepository).toSelf();


//Models
container.bind<typeof UserModel>('UserModel').toConstantValue(UserModel); 
container.bind<typeof UserSubscriptionsModel>('UserSubscriptionsModel').toConstantValue(UserSubscriptionsModel);
container.bind<typeof ExamModel>('ExamModel').toConstantValue(ExamModel);
container.bind<typeof ExamEnrollmentModel>('ExamEnrollmentModel').toConstantValue(ExamEnrollmentModel);
container.bind<typeof ExamScenariosModel>('ExamScenariosModel').toConstantValue(ExamScenariosModel);
container.bind<typeof ExamSubscriptionsModel>('ExamSubscriptionsModel').toConstantValue(ExamSubscriptionsModel);
container.bind<typeof PracticeModel>('PracticeModel').toConstantValue(PracticeModel);
container.bind<typeof PracticeLogsModel>('PracticeLogsModel').toConstantValue(PracticeLogsModel);
// container.bind<typeof TransactionsModel>('TransactionsModel').toConstantValue(TransactionsModel);
container.bind<typeof PaymentsModel>('PaymentsModel').toConstantValue(PaymentsModel);
container.bind<typeof PaymentMethodModel>('PaymentMethodModel').toConstantValue(PaymentMethodModel);
container.bind<typeof PaymentPlansModel>('PaymentPlansModel').toConstantValue(PaymentPlansModel);
container.bind<typeof SubscriptionsModel>('SubscriptionsModel').toConstantValue(SubscriptionsModel);
container.bind<typeof UserActivityLogModel>('UserActivityLogModel').toConstantValue(UserActivityLogModel);
container.bind<typeof ReferralsModel>('ReferralsModel').toConstantValue(ReferralsModel);
container.bind<typeof ReferralPayoutsModel>('ReferralPayoutsModel').toConstantValue(ReferralPayoutsModel);


// Application Services
container.bind<MailtrapEmailService>(MailtrapEmailService).toSelf();
container.bind<ResendEmailService>(ResendEmailService).toSelf();
container.bind<PostmarkEmailService>(PostmarkEmailService).toSelf();

export { container };