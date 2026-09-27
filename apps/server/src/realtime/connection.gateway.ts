import { WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({ path: '/socket.io', serveClient: false })
export class ConnectionGateway {}
