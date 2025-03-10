class Capybara {
    constructor(name) {
        this.name = name;
        this.hunger = 100; // 100 = rassasié, 0 = affamé
        this.happiness = 100; // 100 = très heureux, 0 = triste
        this.lastWalk = new Date();
        this.lastMeal = new Date();
    }

    feed(food) {
        this.hunger = Math.min(100, this.hunger + food.nutritionValue);
        this.lastMeal = new Date();
    }

    walk() {
        this.happiness = Math.min(100, this.happiness + 20);
        this.hunger = Math.max(0, this.hunger - 10);
        this.lastWalk = new Date();
    }
} 