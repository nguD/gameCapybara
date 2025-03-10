class Capybara {
    constructor(name, ownerId) {
        this.id = Date.now().toString();
        this.name = name;
        this.ownerId = ownerId;
        this.hunger = 100;
        this.happiness = 100;
        this.state = 'idle'; // idle, walking, eating
        this.lastWalk = new Date();
        this.lastMeal = new Date();
        this.position = { x: 0, y: 0 };
        
        // Démarrer la diminution naturelle des stats
        this.startLifeCycle();
    }

    startLifeCycle() {
        setInterval(() => {
            this.hunger = Math.max(0, this.hunger - 0.5);
            this.happiness = Math.max(0, this.happiness - 0.3);
            
            if (this.hunger < 30) {
                this.happiness = Math.max(0, this.happiness - 0.5);
            }
        }, 60000); // Mise à jour toutes les minutes
    }

    feed(food) {
        if (this.state === 'eating') return false;
        
        this.state = 'eating';
        this.hunger = Math.min(100, this.hunger + food.nutritionValue);
        this.happiness += 5;
        this.lastMeal = new Date();
        
        setTimeout(() => {
            this.state = 'idle';
        }, 3000);
        
        return true;
    }

    walk() {
        if (this.state === 'walking') return false;
        
        this.state = 'walking';
        this.happiness = Math.min(100, this.happiness + 20);
        this.hunger = Math.max(0, this.hunger - 10);
        this.lastWalk = new Date();
        
        setTimeout(() => {
            this.state = 'idle';
        }, 5000);
        
        return true;
    }

    getStatus() {
        return {
            id: this.id,
            name: this.name,
            hunger: this.hunger,
            happiness: this.happiness,
            state: this.state,
            position: this.position
        };
    }
} 