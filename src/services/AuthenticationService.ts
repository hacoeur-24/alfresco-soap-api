import { SoapService } from '../common/SoapService';

export class AuthenticationService extends SoapService {
  constructor(baseUrl: string) {
    super(`${baseUrl}/alfresco/api/AuthenticationService?wsdl`);
  }

  async login(username: string, password: string): Promise<string> {
    await this.init();
    const result = await this.call('startSession', { username, password });
    // Alfresco returns ticket as result.startSessionReturn.ticket
    return result.startSessionReturn.ticket;
  }

  async logout(ticket: string): Promise<any> {
    await this.init();
    return this.call('endSession', { ticket });
  }
} 