import * as soap from 'soap';
import { Client } from 'soap';

export class SoapService {
  protected wsdlUrl: string;
  public client: Client | null = null;
  private ticket: string | null = null;
  private username: string | null = null;

  constructor(wsdlUrl: string) {
    this.wsdlUrl = wsdlUrl;
  }

  async init(): Promise<void> {
    if (!this.client) {
      this.client = await soap.createClientAsync(this.wsdlUrl);
      if (this.ticket && this.username) {
        this.addTicketHeader(this.username, this.ticket);
      }
    }
  }

  setTicket(ticket: string, username?: string) {
    this.ticket = ticket;
    if (username) this.username = username;
    if (this.client && this.username && this.ticket) {
      this.addTicketHeader(this.username, this.ticket);
    }
  }

  private addTicketHeader(username: string, ticket: string) {
    // Alfresco expects WS-Security UsernameToken: username=alfresco user, password=ticket
    const wsSecurity = new (soap as any).WSSecurity(username, ticket, { passwordType: 'PasswordText', hasTimeStamp: true });
    this.client?.setSecurity(wsSecurity);
  }

  async call<T = any>(method: string, args: any): Promise<T> {
    if (!this.client) {
      throw new Error('SOAP client not initialized. Call init() first.');
    }
    const fn = (this.client as any)[`${method}Async`];
    if (!fn) {
      throw new Error(`Method ${method} not found on SOAP client.`);
    }
    const [result] = await fn(args);
    return result;
  }
} 