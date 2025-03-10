class Trade {
    constructor(senderId, receiverId) {
        this.id = Date.now().toString();
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.senderItems = [];
        this.receiverItems = [];
        this.status = 'pending'; // pending, accepted, rejected, completed
    }

    addItem(playerId, item) {
        if (playerId === this.senderId) {
            this.senderItems.push(item);
        } else if (playerId === this.receiverId) {
            this.receiverItems.push(item);
        }
    }

    accept() {
        this.status = 'accepted';
    }

    reject() {
        this.status = 'rejected';
    }

    complete() {
        this.status = 'completed';
    }
} 