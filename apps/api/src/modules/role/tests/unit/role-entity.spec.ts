import { RoleEntity } from '../../entities/role.entity';
import { RoleScope } from '../../dto/role.enums';

describe('RoleEntity', () => {
  describe('toDomain', () => {
    it('should convert entity to domain correctly', () => {
      const entity = new RoleEntity();
      entity.id = 'role-123';
      entity.name = 'Admin';
      entity.permissions = ['read', 'write', 'delete'];
      entity.scope = RoleScope.Organization;
      entity.createdAt = new Date('2024-01-01');
      entity.updatedAt = new Date('2024-01-02');

      const result = entity.toDomain();
      expect(result.roleId).toBe('role-123');
      expect(result.name).toBe('Admin');
      expect(result.permissions).toEqual(['read', 'write', 'delete']);
      expect(result.scope).toBe(RoleScope.Organization);
    });

    it('should handle empty permissions', () => {
      const entity = new RoleEntity();
      entity.id = 'role-empty';
      entity.name = 'Guest';
      entity.permissions = [];
      entity.scope = RoleScope.Actor;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      const result = entity.toDomain();
      expect(result.permissions).toEqual([]);
    });
  });

  describe('fromDomain', () => {
    it('should create entity from domain correctly', () => {
      const domainData = {
        roleId: 'role-new',
        name: 'Manager',
        permissions: ['read', 'write'],
        scope: RoleScope.Workspace,
        createdAt: new Date('2024-06-15'),
      };

      const result = RoleEntity.fromDomain(domainData);
      expect(result.id).toBe('role-new');
      expect(result.name).toBe('Manager');
      expect(result.permissions).toEqual(['read', 'write']);
      expect(result.scope).toBe(RoleScope.Workspace);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long role name', () => {
      const longName = 'a'.repeat(200);
      const entity = RoleEntity.fromDomain({
        roleId: 'role-long',
        name: longName,
        permissions: ['read'],
        scope: RoleScope.Actor,
        createdAt: new Date(),
      });
      expect(entity.name).toBe(longName);
    });

    it('should handle many permissions', () => {
      const permissions = Array.from({ length: 50 }, (_, i) => `permission-${i}`);
      const entity = RoleEntity.fromDomain({
        roleId: 'role-many-perms',
        name: 'SuperAdmin',
        permissions,
        scope: RoleScope.Organization,
        createdAt: new Date(),
      });
      expect(entity.permissions.length).toBe(50);
    });

    it('should handle all scope types', () => {
      const scopes = [RoleScope.Organization, RoleScope.Workspace, RoleScope.Actor];
      scopes.forEach((scope) => {
        const entity = RoleEntity.fromDomain({
          roleId: `role-${scope}`,
          name: `Role${scope}`,
          permissions: ['read'],
          scope,
          createdAt: new Date(),
        });
        expect(entity.scope).toBe(scope);
      });
    });
  });

  describe('Complex Use Cases', () => {
    it('should handle role hierarchy simulation', () => {
      const roles = ['Admin', 'Manager', 'Supervisor', 'User', 'Guest'];
      const roleEntities = roles.map((name) =>
        RoleEntity.fromDomain({
          roleId: `role-${name.toLowerCase()}`,
          name,
          permissions: name === 'Admin' ? ['*'] : [`${name.toLowerCase()}:*`],
          scope: RoleScope.Organization,
          createdAt: new Date(),
        })
      );
      expect(roleEntities.length).toBe(5);
      expect(roleEntities[0].permissions).toEqual(['*']);
    });

    it('should handle bulk role creation', () => {
      const roles = Array.from({ length: 100 }, (_, i) =>
        RoleEntity.fromDomain({
          roleId: `role-bulk-${i}`,
          name: `Role${i}`,
          permissions: [`perm-${i % 10}`],
          scope: RoleScope.Workspace,
          createdAt: new Date(),
        })
      );
      expect(roles.length).toBe(100);
    });
  });

  describe('Tier-Specific Tests', () => {
    it('should support Free tier basic user role', () => {
      const entity = RoleEntity.fromDomain({
        roleId: 'free-role',
        name: 'User',
        permissions: ['read'],
        scope: RoleScope.Actor,
        createdAt: new Date(),
      });
      expect(entity.permissions.length).toBe(1);
    });

    it('should support Basic tier manager role', () => {
      const entity = RoleEntity.fromDomain({
        roleId: 'basic-role',
        name: 'Manager',
        permissions: ['read', 'write', 'approve'],
        scope: RoleScope.Workspace,
        createdAt: new Date(),
      });
      expect(entity.permissions.length).toBe(3);
    });

    it('should support Pro tier admin role', () => {
      const entity = RoleEntity.fromDomain({
        roleId: 'pro-role',
        name: 'Administrator',
        permissions: ['*'],
        scope: RoleScope.Organization,
        createdAt: new Date(),
      });
      expect(entity.permissions).toEqual(['*']);
    });

    it('should support Enterprise tier roles', () => {
      const enterpriseRoles = [
        { name: 'SuperAdmin', perms: ['*'], scope: RoleScope.Organization },
        { name: 'OrgAdmin', perms: ['org:*'], scope: RoleScope.Organization },
        { name: 'DeptManager', perms: ['dept:*', 'team:read'], scope: RoleScope.Workspace },
        { name: 'Auditor', perms: ['*:read'], scope: RoleScope.Workspace },
      ];

      enterpriseRoles.forEach((role) => {
        const entity = RoleEntity.fromDomain({
          roleId: `enterprise-${role.name.toLowerCase()}`,
          name: role.name,
          permissions: role.perms,
          scope: role.scope,
          createdAt: new Date(),
        });
        expect(entity.permissions).toEqual(role.perms);
        expect(entity.scope).toBe(role.scope);
      });
    });
  });
});
