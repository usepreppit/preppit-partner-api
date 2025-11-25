// Purpose: Configuration file for redis connection.
//check if hostname is localhost or not using env config for local use localhost else use ringconnect_redis
export const redis_config = {
    host: process.env.NODE_ENV === 'development' ? process.env.REDIS_HOST : 'ringconnect-redis-container',
    port:  6379,
};