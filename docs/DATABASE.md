# Database Schema

## Entity Relationship

```mermaid
erDiagram
    User ||--o| UserSettings : has
    User ||--o| UserStats : has
    User ||--o{ RefreshToken : has
    User ||--o{ Room : hosts
    User ||--o{ RoomPlayer : plays
    User ||--o{ GamePlayer : participates
    User ||--o{ Move : makes
    User ||--o{ Message : sends
    User ||--o{ UserAchievement : earns

    Room ||--o{ RoomPlayer : contains
    Room ||--o| HouseRules : configures
    Room ||--o{ Message : has
    Room ||--o{ Game : runs
    Room ||--o{ VoiceSession : hosts

    Game ||--o{ GamePlayer : includes
    Game ||--o{ Move : records

    Achievement ||--o{ UserAchievement : awarded
```

## Core Tables

### Users
- Authentication (local + Google OAuth)
- Profile (username, avatar, color)

### Rooms
- 6-character join codes
- Host controls, player limits
- Status lifecycle: WAITING → STARTING → IN_PROGRESS → FINISHED

### HouseRules
- One-to-one with Room
- Standard variants (stack +2, jump-in, seven-O, etc.)
- Custom rules stored as JSON array

### Games & Moves
- Full game state persisted as JSON
- Individual moves logged for replay/stats

### Messages
- Chat history (USER, SYSTEM, GAME types)
- Persisted per room

### UserStats
- Wins, losses, streaks, points
- Powers leaderboard queries

## Indexes

- `Room.code` — fast room lookup
- `User.email`, `User.username` — auth queries
- `Message.roomId + createdAt` — chat history
- `UserStats.wins, totalPoints` — leaderboard sorting
