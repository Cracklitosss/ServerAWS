import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

interface ClientData {
    userId: string;
    IdEsp: number;
}

const port = process.env.WEBSOCKET_PORT || '3004';
const io = new Server(parseInt(port), {
    cors: {
        origin: "*", // Ajustar los orígenes permitidos en producción
        methods: ["GET", "POST"]
    }
});

// Almacenar datos de usuarios por socket ID
const clientData: Record<string, ClientData> = {};

io.on("connection", (socket) => {
    console.log("Nuevo cliente conectado:", socket.id);

    socket.on("authenticate", (data) => {
    const token = data.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || '12345');
            if (typeof decoded === 'object' && 'id' in decoded && 'IdEsp' in decoded) {
                clientData[socket.id] = { userId: decoded.id, IdEsp: Number(decoded.IdEsp) };
                console.log("Datos almacenados para este socket después de autenticar:", clientData[socket.id]);
            } else {
                throw new Error("Invalid token structure");
            }
        } catch (error) {
            console.log("Error al verificar el token:", error);
            socket.emit("auth_error", "Token inválido");
        }
    } else {
        socket.emit("auth_error", "No se proporcionó token");
    }
});


    
socket.on("sensorData", (sensorData) => {
    console.log("Datos de sensor recibidos:", sensorData);

    // Enviar datos al cliente que tenga el mismo IdEsp
    Object.entries(clientData).forEach(([socketId, data]) => {
        if (data.IdEsp === sensorData.IdEsp) {
            console.log(`Enviando datos al cliente específico en socket ${socketId}`);
            io.to(socketId).emit("updateSensorData", sensorData);
        }
    });
});



    socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
        // Limpiar los datos almacenados cuando el cliente se desconecta
        delete clientData[socket.id];
    });
});

console.log(`Servidor WebSocket escuchando en el puerto ${port}`);
