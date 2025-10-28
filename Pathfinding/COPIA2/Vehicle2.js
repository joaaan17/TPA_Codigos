class Vehicle {
    constructor(x, y) {
      this.position = createVector(x, y);
      this.velocity = createVector(0, 0);
      this.acceleration = createVector(0, 0);
      //{!1} Additional variable for size
      this.r = 6.0;
      //{!2} Arbitrary values for max speed and force; try varying these!
      this.maxspeed = 8;
      this.maxforce = 0.2;
    }
  
    // Standard update function
    update() {
      this.velocity.add(this.acceleration);
      this.velocity.limit(this.maxspeed);
      this.position.add(this.velocity);
      this.acceleration.mult(0);
    }
  
    // Newton’s second law (skipping the math)
    applyForce(force) {
      this.acceleration.add(force);
    }
  
    // The seek steering force algorithm
    seek(target) {
      let desired = p5.Vector.sub(target, this.position);
      desired.setMag(this.maxspeed);
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  
    show() {
      // The vehicle is a triangle pointing in the direction of velocity.
      let angle = this.velocity.heading();
      fill(127);
      stroke(0);
      push();
      translate(this.position.x, this.position.y);
      rotate(angle);
      beginShape();
      vertex(this.r * 2, 0);
      vertex(-this.r * 2, -this.r);
      vertex(-this.r * 2, this.r);
      endShape(CLOSE);
      pop();
    }
  }