/**
 * Damageable: Core damage and health state component.
 */
export class Damageable {
  constructor(config = {}) {
    this.maxHealth = config.maxHealth || 100;
    this.health = this.maxHealth;
    this.faction = config.faction || 'enemy'; // 'player' | 'enemy' | 'prop'
    this.isDead = false;

    this.onDamaged = config.onDamaged || null;
    this.onKilled = config.onKilled || null;
  }

  takeDamage(amount, damageType = 'arc', hitPoint = null, knockbackDir = null, knockbackForce = 0) {
    if (this.isDead) return 0;

    const actualDamage = Math.min(this.health, amount);
    this.health -= actualDamage;

    if (this.onDamaged) {
      this.onDamaged(actualDamage, damageType, hitPoint, knockbackDir, knockbackForce);
    }

    if (this.health <= 0) {
      this.isDead = true;
      if (this.onKilled) {
        this.onKilled(damageType, hitPoint);
      }
    }

    return actualDamage;
  }

  heal(amount) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
