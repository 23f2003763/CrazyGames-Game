import { Damageable } from '../combat/Damageable.js';

/**
 * EnemyHealth: Specialized damageable handler for machine enemies with hit-flash
 * and death destruction callbacks.
 */
export class EnemyHealth extends Damageable {
  constructor(config = {}) {
    super({
      maxHealth: config.maxHealth || 60,
      faction: 'enemy',
      onDamaged: config.onDamaged,
      onKilled: config.onKilled
    });
  }
}
