require('dotenv').config();
const mongoose = require('mongoose');
const Trip = require('./models/Trip');
const { Vehicle } = require('./models/transportModels');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edumind', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🔌 Connected to DB for Simulation'))
.catch(err => console.error('DB Connection Error:', err));

// Simulation Route (Bangalore coordinates example)
const routePath = [
  { lat: 12.9716, lng: 77.5946 },
  { lat: 12.9720, lng: 77.5950 },
  { lat: 12.9730, lng: 77.5960 },
  { lat: 12.9740, lng: 77.5970 },
  { lat: 12.9750, lng: 77.5980 },
  { lat: 12.9760, lng: 77.5990 },
  { lat: 12.9770, lng: 77.6000 },
  { lat: 12.9780, lng: 77.6010 },
  { lat: 12.9790, lng: 77.6020 },
  { lat: 12.9800, lng: 77.6030 },
];

async function runSimulation() {
  try {
    // 1. Find an active trip or create one
    let trip = await Trip.findOne({ status: 'in-progress' });
    
    if (!trip) {
      console.log('No active trip found. Creating a demo trip...');
      // Find a vehicle to assign
      let vehicle = await Vehicle.findOne();
      if (!vehicle) {
        vehicle = await Vehicle.create({
          vehicleNumber: 'SIM-BUS-01',
          routeName: 'Simulation Route',
          status: 'Active'
        });
      }

      trip = await Trip.create({
        vehicleId: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        routeName: 'Simulation Route',
        status: 'in-progress',
        date: new Date(),
        currentLocation: routePath[0],
        stops: [
          { name: 'Start Point', coordinates: routePath[0], isReached: true },
          { name: 'Midway Stop', coordinates: routePath[4], isReached: false }, // Near index 4
          { name: 'End Point', coordinates: routePath[9], isReached: false }   // Near index 9
        ]
      });
    }

    console.log(`🚀 Simulating Trip: ${trip._id} (${trip.routeName})`);

    let step = 0;
    setInterval(async () => {
      const loc = routePath[step % routePath.length];
      
      // Update Trip in DB
      await Trip.findByIdAndUpdate(trip._id, {
        currentLocation: loc
      });

      console.log(`📍 Location updated: ${loc.lat}, ${loc.lng}`);
      
      // In a real app, the server would watch change streams or receive this update 
      // and emit the socket event. Since this is an external script, we rely on 
      // the polling or socket logic in the main server to pick up these DB changes if configured,
      // or simply assume the frontend polls for this demo.
      
      step++;
    }, 3000); // Update every 3 seconds

  } catch (error) {
    console.error('Simulation Error:', error);
  }
}

runSimulation();