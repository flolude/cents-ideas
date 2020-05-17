import * as http from 'http';
import {injectable, inject} from 'inversify';

import {Logger} from '@centsideas/utils';
import {EventTopics, IdeaEvents, LoginEvents, UserEvents} from '@centsideas/enums';
import {IEvent} from '@centsideas/models';
import {MessageBroker} from '@centsideas/event-sourcing';
import {RpcServer, INotificationCommands, RPC_TYPES, RpcServerFactory} from '@centsideas/rpc';
import {GlobalEnvironment} from '@centsideas/environment';

import {NotificationSettingsHandlers} from './notification-settings.handlers';
import {NotificationsHandlers} from './notifications.handlers';
import {NotificationEnvironment} from './notifications.environment';

@injectable()
export class NotificationsServer {
  private rpcServer: RpcServer = this.rpcServerFactory(this.env.rpcPort);

  constructor(
    private env: NotificationEnvironment,
    private globalEnv: GlobalEnvironment,
    private notificationSettingsHandlers: NotificationSettingsHandlers,
    private messageBroker: MessageBroker,
    private notificationsHandler: NotificationsHandlers,
    private logger: Logger,
    @inject(RPC_TYPES.RPC_SERVER_FACTORY) private rpcServerFactory: RpcServerFactory,
  ) {
    this.logger.info('launch in', this.globalEnv.environment, 'mode');

    // FIXME also consider kafka connection in health checks
    http
      .createServer((_, res) => res.writeHead(this.rpcServer.isRunning ? 200 : 500).end())
      .listen(3000);

    const commandService = this.rpcServer.loadService('notification', 'NotificationCommands');
    this.rpcServer.addService<INotificationCommands>(commandService, {
      subscribePush: this.notificationSettingsHandlers.addPushSubscription,
      updateSettings: this.notificationSettingsHandlers.updateSettings,
      getSettings: this.notificationSettingsHandlers.getSettings,
    });

    // FIXME better error handling
    try {
      this.messageBroker.events(EventTopics.Ideas).subscribe(this.handleIdeasEvents);
      this.messageBroker.events(EventTopics.Logins).subscribe(this.handleLoginEvents);
      this.messageBroker.events(EventTopics.Users).subscribe(this.handleUsersEvents);
    } catch (error) {
      this.logger.error(error);
    }
  }

  private handleIdeasEvents = async (event: IEvent<any>) => {
    switch (event.name) {
      case IdeaEvents.IdeaCreated:
        return this.notificationsHandler.handleIdeaCreatedNotification(event);
    }
  };

  private handleLoginEvents = async (event: IEvent<any>) => {
    switch (event.name) {
      case LoginEvents.LoginRequested:
        return this.notificationsHandler.handleLoginNotification(event);
    }
  };

  private handleUsersEvents = async (event: IEvent<any>) => {
    switch (event.name) {
      case UserEvents.EmailChangeRequested:
        return this.notificationsHandler.handleEmailChangeRequestedNotification(event);

      case UserEvents.EmailChangeConfirmed:
        return this.notificationsHandler.handleEmailChangedNotification(event);
    }
  };
}
