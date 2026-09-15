import { CacheService, redis } from '@/utils/redis';

describe('CacheService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should serialize objects to JSON and set without TTL', async () => {
      const mockData = { id: 1, name: 'Test Object' };

      await CacheService.set('test:key', mockData);

      expect(redis.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(mockData)
      );
    });

    it('should set key with EX TTL when ttlSeconds is provided', async () => {
      await CacheService.set('test:key', 'value', 3600);

      expect(redis.set).toHaveBeenCalledWith('test:key', 'value', 'EX', 3600);
    });
  });

  describe('get', () => {
    it('should return parsed object when valid JSON string is stored', async () => {
      const mockData = { id: 1, name: 'Clinic Sync' };
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await CacheService.get<typeof mockData>('test:key');

      expect(result).toEqual(mockData);
    });

    it('should return null if key does not exist', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await CacheService.get('missing:key');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should call redis.del with filtered valid keys', async () => {
      await CacheService.del('key1', 'key2');

      expect(redis.del).toHaveBeenCalledWith('key1', 'key2');
    });
  });
});
