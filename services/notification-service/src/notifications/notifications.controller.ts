import { Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('mine')
  mine(@CurrentUser() user: GatewayUser) {
    return this.notifications.findForUser(user.id);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: GatewayUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: GatewayUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
