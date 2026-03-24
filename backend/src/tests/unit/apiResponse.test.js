import { ApiResponseHelper } from '../../utils/apiResponse.js';

describe('ApiResponseHelper', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  test('success returns 200 with data', () => {
    ApiResponseHelper.success(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'OK', data: { id: 1 } });
  });

  test('created returns 201', () => {
    ApiResponseHelper.created(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
  });

  test('notFound returns 404', () => {
    ApiResponseHelper.notFound(res, 'Booking');
    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('paginated includes pagination metadata', () => {
    ApiResponseHelper.paginated(res, [1,2,3], { page: 1, limit: 10, total: 25 });
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.totalPages).toBe(3);
    expect(body.pagination.hasNext).toBe(true);
    expect(body.pagination.hasPrev).toBe(false);
  });

  test('error returns structured error', () => {
    ApiResponseHelper.error(res, 'Something failed', 500, 'INTERNAL_ERROR');
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  test('badRequest returns 400', () => {
    ApiResponseHelper.badRequest(res, 'Invalid input');
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
