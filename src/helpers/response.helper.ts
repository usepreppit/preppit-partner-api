import { Response } from 'express';

// Interface for standardized response format
interface ApiResponseType<T = unknown> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

// Interface for pagination metadata
interface PaginationMetadata {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export class ApiResponse<T = unknown> {
    private readonly response: ApiResponseType<T>;

    constructor(
        statusCode: number = 200,
        message: string = 'Success',
        data?: T,
        metadata: Record<string, unknown> = {}
    ) {
        this.response = {
            success: true,
            statusCode,
            message,
            data,
            metadata,
            timestamp: new Date().toISOString(),
        };
    }

    public send(res: Response): Response {
        return res.status(this.response.statusCode).json(this.response);
    }

    public static ok<T>(data?: T, message?: string): ApiResponse<T> {
        return new ApiResponse(200, message ?? 'Request successful', data);
    }

    public static created<T>(data?: T, message?: string): ApiResponse<T> {
        return new ApiResponse(201, message ?? 'Resource created', data);
    }

    public static accepted(message?: string): ApiResponse {
        return new ApiResponse(202, message ?? 'Request accepted');
    }

    public static noContent(message?: string): ApiResponse {
        return new ApiResponse(204, message ?? 'No content');
    }

    public static badRequest(message: string): ApiResponse {
        return new ApiResponse(400, message);
    }

    public static unauthorized(message: string): ApiResponse {
        return new ApiResponse(401, message);
    }

    public static forbidden(message: string): ApiResponse {
        return new ApiResponse(403, message);
    }

    public static notFound(message: string): ApiResponse {
        return new ApiResponse(404, message);
    }

    public static paginated<T>(
        data: T[],
        pagination: PaginationMetadata,
        message?: string
    ): ApiResponse<T[]> {
        return new ApiResponse<T[]>(200, message ?? 'Paginated results', data, {
            pagination,
        });
    }

    // Add custom metadata to the response
    public addMetadata(metadata: Record<string, unknown>): ApiResponse<T> {
        return new ApiResponse<T>(
            this.response.statusCode,
            this.response.message,
            this.response.data,
            { ...this.response.metadata, ...metadata }
        );
    }
}