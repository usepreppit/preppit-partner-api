import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { UserService } from './users.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class UserController {
    constructor(
        @inject(UserService) private readonly userService: UserService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetMe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const curr_user = await this.userService.GetMe(user_id);

                ApiResponse.ok(curr_user, 'user fetched successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching logged in user', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }
}