import Matter from 'matter-js';
import type { GridPoint } from '@linebound/domain';

export const COLLISION_CATEGORY = {
  TERRAIN: 0x0001,
  DECK: 0x0002,
  TRUSS: 0x0004,
  NODE: 0x0008,
  TRUCK: 0x0010,
} as const;

export interface TruckConfig {
  width: number;
  height: number;
  speed: number;
  wheelRadius: number;
  mass: number;
}

export const DEFAULT_TRUCK_CONFIG: TruckConfig = {
  width: 60,
  height: 25,
  speed: 1.8,
  wheelRadius: 10,
  mass: 5.0,
};

/**
 * 시뮬레이션 트럭 모델 (PRD 5.4)
 * Matter.js 복합 바디(차체 + 앞/뒤 바퀴)로 구성되어
 * 부재(다리 상판) 및 지형 위를 주행합니다.
 */
export class SimulationTruck {
  public readonly composite: Matter.Composite;
  public readonly chassis: Matter.Body;
  public readonly wheelFront: Matter.Body;
  public readonly wheelBack: Matter.Body;

  private targetSpeed: number;
  private driveElapsedSec: number = 0;

  constructor(
    startX: number,
    startY: number,
    config: TruckConfig = DEFAULT_TRUCK_CONFIG,
  ) {
    this.targetSpeed = config.speed;

    const { width, height, wheelRadius, mass } = config;
    const collisionMask =
      COLLISION_CATEGORY.TERRAIN |
      COLLISION_CATEGORY.DECK |
      COLLISION_CATEGORY.TRUSS;

    // 차체 (Chassis)
    this.chassis = Matter.Bodies.rectangle(startX, startY, width, height, {
      collisionFilter: {
        group: -1,
        category: COLLISION_CATEGORY.TRUCK,
        mask: collisionMask,
      },
      density: 0.002,
      friction: 0.5,
      frictionAir: 0.02,
      restitution: 0.0,
      label: 'truck_chassis',
    });

    Matter.Body.setMass(this.chassis, mass);

    // 앞바퀴, 뒷바퀴
    // Matter.Bodies.circle은 반지름 10일 때 내부적으로 10각형 다각형을 생성해 주행 진동을 유발하므로,
    // 64각형 정다각형으로 생성하여 진원에 가까운 매끄러운 굴림을 보장합니다.
    const wheelSides = 64;
    const wheelOffset = width * 0.35;
    const axleY = startY + height * 0.5;

    this.wheelBack = Matter.Bodies.polygon(
      startX - wheelOffset,
      axleY,
      wheelSides,
      wheelRadius,
      {
        collisionFilter: {
          group: -1,
          category: COLLISION_CATEGORY.TRUCK,
          mask: collisionMask,
        },
        friction: 0.95,
        restitution: 0.0,
        density: 0.005,
        label: 'truck_wheel_back',
      },
    );
    this.wheelBack.circleRadius = wheelRadius;

    this.wheelFront = Matter.Bodies.polygon(
      startX + wheelOffset,
      axleY,
      wheelSides,
      wheelRadius,
      {
        collisionFilter: {
          group: -1,
          category: COLLISION_CATEGORY.TRUCK,
          mask: collisionMask,
        },
        friction: 0.95,
        restitution: 0.0,
        density: 0.005,
        label: 'truck_wheel_front',
      },
    );
    this.wheelFront.circleRadius = wheelRadius;

    // 축 제약 조건 (Axle Constraints + 삼각 보조 지지대로 바퀴 회전은 자유롭게 유지하며 축 유격 제거)
    const axleBack = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: -wheelOffset, y: height * 0.5 },
      bodyB: this.wheelBack,
      pointB: { x: 0, y: 0 },
      stiffness: 1.0,
      damping: 0.25,
      length: 0,
    });

    const axleFront = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: wheelOffset, y: height * 0.5 },
      bodyB: this.wheelFront,
      pointB: { x: 0, y: 0 },
      stiffness: 1.0,
      damping: 0.25,
      length: 0,
    });

    const strutLength = Math.hypot(wheelOffset, height);
    const strutBack = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 0, y: -height * 0.5 },
      bodyB: this.wheelBack,
      pointB: { x: 0, y: 0 },
      stiffness: 1.0,
      damping: 0.25,
      length: strutLength,
    });

    const strutFront = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 0, y: -height * 0.5 },
      bodyB: this.wheelFront,
      pointB: { x: 0, y: 0 },
      stiffness: 1.0,
      damping: 0.25,
      length: strutLength,
    });

    this.composite = Matter.Composite.create({ label: 'truck_composite' });
    Matter.Composite.add(this.composite, [
      this.chassis,
      this.wheelBack,
      this.wheelFront,
      axleBack,
      axleFront,
      strutBack,
      strutFront,
    ]);
  }

  /**
   * 초기 지면 안착 후 잔여 속도 및 회전각을 정리합니다.
   */
  resetMotion(): void {
    this.driveElapsedSec = 0;
    Matter.Body.setAngle(this.chassis, 0);
    for (const body of [this.chassis, this.wheelBack, this.wheelFront]) {
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
    }
  }

  /**
   * 바퀴에 회전 각속도를 부여해 전진시킵니다.
   * 출발 직후 급발진 반동(앞머리 들림)을 막기 위해 짧게 소프트 스타트 가속합니다.
   */
  drive(dtSec: number = 1 / 240): void {
    this.driveElapsedSec += dtSec;
    const rampDuration = 0.22;
    const t = Math.min(1, Math.max(0, this.driveElapsedSec / rampDuration));
    const smoothRamp = t * t * (3 - 2 * t);
    const angularSpeed = (this.targetSpeed / 10) * (0.25 + 0.75 * smoothRamp);

    if (this.wheelBack.angularVelocity < angularSpeed) {
      Matter.Body.setAngularVelocity(this.wheelBack, angularSpeed);
    }
    if (this.wheelFront.angularVelocity < angularSpeed) {
      Matter.Body.setAngularVelocity(this.wheelFront, angularSpeed);
    }
  }

  /**
   * 트럭의 중심 위치(월드 픽셀)
   */
  getPosition(): { x: number; y: number } {
    return {
      x: this.chassis.position.x,
      y: this.chassis.position.y,
    };
  }

  /**
   * 트럭 차체의 회전 각도(라디안)
   */
  getAngle(): number {
    return this.chassis.angle;
  }

  /**
   * 트럭의 격자 좌표 (cellSize로 나눈 값)
   */
  getGridPosition(cellSize: number): GridPoint {
    return {
      x: this.chassis.position.x / cellSize,
      y: this.chassis.position.y / cellSize,
    };
  }
}
