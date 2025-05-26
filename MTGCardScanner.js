const { useState, useRef, useEffect } = React;
const { 
  Camera, Search, Star, DollarSign, Eye, BookOpen, Zap, Shield, Heart, 
  Swords, X, Upload, Scan, Loader, Wifi, WifiOff 
} = lucideReact;

const MTGCardScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [recognizedCard, setRecognizedCard] = useState(null);
  const [collection, setCollection] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');
  const [cardDatabase, setCardDatabase] = useState([]);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load cards from Scryfall API
  const loadCardsFromScryfall = async (query = 'is:commander OR type:planeswalker OR name:"Lightning Bolt" OR name:"Black Lotus"') => {
    setIsLoadingDatabase(true);
    setApiStatus('connecting');
    
    try {
      console.log('🔮 Loading cards from Scryfall API...');
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&page=1&order=name`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const processedCards = data.data.map(card => ({
          id: card.id,
          name: card.name,
          manaCost: card.mana_cost || '{0}',
          type: card.type_line,
          rarity: card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1),
          text: card.oracle_text || 'No rules text available.',
          power: card.power || null,
          toughness: card.toughness || null,
          price: parseFloat(card.prices?.usd || card.prices?.usd_foil || '0.00'),
          imageUrl: card.image_uris?.normal || card.image_uris?.large || card.image_uris?.small || '',
          colors: card.colors || ['Colorless'],
          cmc: card.cmc || 0,
          setName: card.set_name,
          artist: card.artist,
          scryfallUrl: card.scryfall_uri
        }));
        
        setCardDatabase(processedCards);
        setApiStatus('connected');
        console.log(`✅ Loaded ${processedCards.length} REAL MTG cards from Scryfall!`);
      } else {
        throw new Error('No cards found in API response');
      }
    } catch (error) {
      console.error('❌ Error loading cards from Scryfall:', error);
      setApiStatus('error');
      
      // Fallback to sample cards if API fails
      const fallbackCards = [
        {
          id: 'fallback-1',
          name: 'Lightning Bolt',
          manaCost: '{R}',
          type: 'Instant',
          rarity: 'Common',
          text: 'Lightning Bolt deals 3 damage to any target.',
          power: null,
          toughness: null,
          price: 0.50,
          imageUrl: '',
          colors: ['Red'],
          cmc: 1,
          setName: 'Multiple Sets',
          artist: 'Christopher Rush'
        },
        {
          id: 'fallback-2',
          name: 'Black Lotus',
          manaCost: '{0}',
          type: 'Artifact',
          rarity: 'Mythic Rare',
          text: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
          power: null,
          toughness: null,
          price: 25000.00,
          imageUrl: '',
          colors: ['Colorless'],
          cmc: 0,
          setName: 'Alpha',
          artist: 'Christopher Rush'
        },
        {
          id: 'fallback-3',
          name: 'Jace, the Mind Sculptor',
          manaCost: '{2}{U}{U}',
          type: 'Legendary Planeswalker — Jace',
          rarity: 'Mythic Rare',
          text: '+2: Look at the top card of target player\'s library. You may put that card on the bottom of that player\'s library.',
          power: null,
          toughness: null,
          price: 120.00,
          imageUrl: '',
          colors: ['Blue'],
          cmc: 4,
          setName: 'Worldwake',
          artist: 'Jason Chan'
        }
      ];
      
      setCardDatabase(fallbackCards);
      console.log('Using fallback card database');
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  // Enhanced search with Scryfall API
  const searchCards = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`🔍 Searching Scryfall for: "${query}"`);
      const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&page=1&order=name`);
      
      if (!response.ok) {
        // If API search fails, fall back to local database search
        const localResults = cardDatabase.filter(card =>
          card.name.toLowerCase().includes(query.toLowerCase()) ||
          card.type.toLowerCase().includes(query.toLowerCase()) ||
          card.text.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20);
        
        setSearchResults(localResults);
        return;
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const results = data.data.slice(0, 20).map(card => ({
          id: card.id,
          name: card.name,
          manaCost: card.mana_cost || '{0}',
          type: card.type_line,
          rarity: card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1),
          text: card.oracle_text || 'No rules text available.',
          power: card.power || null,
          toughness: card.toughness || null,
          price: parseFloat(card.prices?.usd || card.prices?.usd_foil || '0.00'),
          imageUrl: card.image_uris?.normal || card.image_uris?.large || '',
          colors: card.colors || ['Colorless'],
          cmc: card.cmc || 0,
          setName: card.set_name,
          artist: card.artist
        }));
        
        setSearchResults(results);
        console.log(`Found ${results.length} cards matching "${query}"`);
      } else {
        setSearchResults([]);
        console.log(`No cards found for "${query}"`);
      }
    } catch (error) {
      console.error('Search error:', error);
      
      // Fallback to local search if API fails
      const localResults = cardDatabase.filter(card =>
        card.name.toLowerCase().includes(query.toLowerCase()) ||
        card.type.toLowerCase().includes(query.toLowerCase()) ||
        card.text.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);
      
      setSearchResults(localResults);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced card recognition (still simulated but uses real data)
  const recognizeCard = async (imageData) => {
    setIsLoading(true);
    
    try {
      // Simulate processing time for "AI recognition"
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (cardDatabase.length > 0) {
        // For now, randomly select from loaded cards (later we'll add real CV)
        const randomCard = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
        const confidence = Math.round((Math.random() * 25) + 75); // 75-100% confidence for realism
        
        setRecognizedCard({
          ...randomCard,
          confidence: confidence,
          timestamp: new Date().toISOString(),
          recognitionMethod: '🔮 Simulated AI (Real card data from Scryfall)'
        });
        
        console.log(`🎯 "Recognized" ${randomCard.name} with ${confidence}% confidence`);
      } else {
        setRecognizedCard({
          error: "Card database not loaded. Please wait for Scryfall connection.",
          confidence: 0
        });
      }
      
    } catch (error) {
      console.error('Recognition error:', error);
      setRecognizedCard({
        error: "Recognition failed. Please try again with better lighting.",
        confidence: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const cameras = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        groupId: device.groupId
      }));
      
      setAvailableCameras(cameras);
      
      // Auto-select the first camera if none selected
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      
      console.log(`📷 Found ${cameras.length} cameras:`, cameras);
      return cameras;
    } catch (error) {
      console.error('❌ Error getting cameras:', error);
      setCameraError('Unable to access camera devices. Please check permissions.');
      return [];
    }
  };

  // Enhanced camera functionality
  const startCamera = async () => {
    setCameraError('');
    
    try {
      // First, get available cameras if we don't have them
      let cameras = availableCameras;
      if (cameras.length === 0) {
        cameras = await getAvailableCameras();
      }
      
      if (cameras.length === 0) {
        throw new Error('No cameras found');
      }
      
      // Use selected camera or default to first available
      const cameraId = selectedCamera || cameras[0].deviceId;
      
      console.log(`📷 Starting camera: ${cameras.find(c => c.deviceId === cameraId)?.label || 'Unknown'}`);
      
      const constraints = {
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: cameraId ? undefined : 'environment' // Use facingMode only if no specific camera
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        console.log('✅ Camera started successfully');
      }
    } catch (err) {
      console.error('❌ Camera error:', err);
      
      let errorMessage = 'Camera access failed. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and refresh.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Selected camera not available. Try a different camera.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    console.log('📷 Camera stopped');
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      console.log('📸 Image captured, starting recognition...');
      recognizeCard(imageData);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('📁 Image uploaded, starting recognition...');
        recognizeCard(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addToCollection = (card) => {
    const existingCard = collection.find(c => c.id === card.id);
    if (existingCard) {
      setCollection(collection.map(c => 
        c.id === card.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
      console.log(`➕ Added another ${card.name} to collection (total: ${existingCard.quantity + 1})`);
    } else {
      setCollection([...collection, { ...card, quantity: 1, dateAdded: new Date().toISOString() }]);
      console.log(`🆕 Added ${card.name} to collection`);
    }
  };

  // Load cards when component mounts
  useEffect(() => {
    console.log('🚀 MTG Scanner Pro starting up...');
    loadCardsFromScryfall();
    
    // Get available cameras on startup
    getAvailableCameras();
  }, []);

  // Enhanced search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchCards(searchQuery);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery, cardDatabase]);

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-blue-400';
      case 'rare': return 'text-yellow-400';
      case 'mythic rare': 
      case 'mythic': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatPrice = (price) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
    if (price >= 100) return `$${price.toFixed(0)}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  };

  const CardDisplay = ({ card, showActions = true }) => (
    React.createElement('div', {
      className: "bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 shadow-2xl transform hover:scale-[1.02] transition-all duration-300"
    },
      React.createElement('div', { className: "max-w-6xl mx-auto px-4 py-4" },
        React.createElement('div', { className: "flex items-center justify-between" },
          React.createElement('div', { className: "flex items-center gap-3" },
            React.createElement('div', { className: "w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse" },
              React.createElement(Eye, { className: "w-7 h-7" })
            ),
            React.createElement('div', {},
              React.createElement('h1', { className: "text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent" }, "MTG Scanner Pro"),
              React.createElement('div', { className: "flex items-center gap-3" },
                React.createElement('p', { className: "text-sm text-gray-400" }, "🔮 Enhanced AI Recognition System"),
                React.createElement(ApiStatusIndicator)
              )
            )
          ),
          React.createElement('div', { className: "text-right" },
            React.createElement('div', { className: "text-sm text-gray-400" }, "Collection"),
            React.createElement('div', { className: "text-2xl font-bold text-blue-400" }, `${totalCards} cards`),
            React.createElement('div', { className: "text-lg font-bold text-green-400" }, formatPrice(collectionValue))
          )
        )
      )
    ),

    // Enhanced Navigation
    React.createElement('div', { className: "max-w-6xl mx-auto px-4 py-6" },
      React.createElement('div', { className: "flex gap-2 bg-black/20 rounded-2xl p-2 backdrop-blur-sm border border-white/10" },
        [
          { id: 'scanner', label: 'Scanner', icon: Camera },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'collection', label: 'Collection', icon: BookOpen }
        ].map(tab => {
          const Icon = tab.icon;
          return React.createElement('button', {
            key: tab.id,
            onClick: () => setActiveTab(tab.id),
            className: `flex-1 py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl transform scale-105' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`
          },
            React.createElement(Icon, { className: "w-5 h-5" }),
            tab.label
          );
        })
      )
    ),

    React.createElement('div', { className: "max-w-6xl mx-auto px-4 pb-8" },
      // Scanner Tab
      activeTab === 'scanner' && React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "bg-black/20 rounded-2xl p-8 border border-white/10 backdrop-blur-sm" },
          React.createElement('h2', { className: "text-2xl font-bold mb-6 flex items-center gap-3" },
            React.createElement(Scan, { className: "w-7 h-7 text-blue-400" }),
            "🔮 AI Card Recognition"
          ),
          
          React.createElement('div', { className: "grid lg:grid-cols-2 gap-8" },
            React.createElement('div', {},
              // Camera Selector
              availableCameras.length > 1 && React.createElement('div', { className: "mb-6" },
                React.createElement('label', { className: "block text-sm font-medium text-gray-300 mb-3" }, "📷 Select Camera:"),
                React.createElement('select', {
                  value: selectedCamera,
                  onChange: (e) => setSelectedCamera(e.target.value),
                  className: "w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                },
                  availableCameras.map((camera) =>
                    React.createElement('option', { key: camera.deviceId, value: camera.deviceId }, camera.label)
                  )
                )
              ),
              
              // Camera Error Display
              cameraError && React.createElement('div', { className: "mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg backdrop-blur-sm" },
                React.createElement('p', { className: "text-red-300 text-sm" }, cameraError),
                React.createElement('button', {
                  onClick: () => {
                    setCameraError('');
                    getAvailableCameras();
                  },
                  className: "mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
                }, "🔄 Refresh cameras")
              ),
              
              React.createElement('div', { className: "bg-black rounded-2xl overflow-hidden mb-6 border-2 border-purple-500/30" },
                React.createElement('video', {
                  ref: videoRef,
                  autoPlay: true,
                  playsInline: true,
                  className: "w-full h-80 object-cover",
                  style: { display: isScanning ? 'block' : 'none' }
                }),
                !isScanning && React.createElement('div', { className: "w-full h-80 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center" },
                  React.createElement('div', { className: "text-center" },
                    React.createElement(Camera, { className: "w-16 h-16 text-purple-400 mx-auto mb-4 animate-bounce" }),
                    React.createElement('p', { className: "text-purple-400 text-lg font-bold" }, "Camera Ready"),
                    availableCameras.length > 0 && React.createElement('p', { className: "text-xs text-gray-500 mt-2" }, `📷 ${availableCameras.length} camera(s) detected`)
                  )
                )
              ),
              
              React.createElement('div', { className: "flex gap-3" },
                !isScanning ? [
                  React.createElement('button', {
                    key: "start",
                    onClick: startCamera,
                    disabled: availableCameras.length === 0,
                    className: "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  },
                    React.createElement(Camera, { className: "w-6 h-6" }),
                    availableCameras.length === 0 ? 'No Cameras Found' : '🚀 Start Camera'
                  ),
                  availableCameras.length === 0 && React.createElement('button', {
                    key: "refresh",
                    onClick: getAvailableCameras,
                    className: "px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors",
                    title: "Refresh camera list"
                  }, "🔄")
                ] : [
                  React.createElement('button', {
                    key: "capture",
                    onClick: captureImage,
                    disabled: isLoading,
                    className: "flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  },
                    isLoading ? React.createElement(Loader, { className: "w-6 h-6 animate-spin" }) : React.createElement(Zap, { className: "w-6 h-6" }),
                    isLoading ? '🔮 Recognizing...' : '⚡ Scan Card'
                  ),
                  React.createElement('button', {
                    key: "stop",
                    onClick: stopCamera,
                    className: "px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                  },
                    React.createElement(X, { className: "w-6 h-6" })
                  )
                ]
              ),
              
              React.createElement('div', { className: "mt-4" },
                React.createElement('input', {
                  ref: fileInputRef,
                  type: "file",
                  accept: "image/*",
                  onChange: handleFileUpload,
                  className: "hidden"
                }),
                React.createElement('button', {
                  onClick: () => fileInputRef.current?.click(),
                  disabled: isLoading,
                  className: "w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl"
                },
                  React.createElement(Upload, { className: "w-6 h-6" }),
                  "📁 Upload Image"
                )
              )
            ),
            
            React.createElement('div', {},
              recognizedCard && !recognizedCard.error ? React.createElement(CardDisplay, { card: recognizedCard }) :
              recognizedCard?.error ? React.createElement('div', { className: "bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center backdrop-blur-sm" },
                React.createElement(X, { className: "w-16 h-16 text-red-400 mx-auto mb-4" }),
                React.createElement('p', { className: "text-red-300 mb-3 text-lg" }, recognizedCard.error),
                apiStatus === 'error' && React.createElement('p', { className: "text-yellow-400 text-sm" }, "📡 Note: Using offline card database")
              ) : React.createElement('div', { className: "bg-gradient-to-br from-gray-800/50 to-purple-900/20 rounded-2xl p-10 text-center border-2 border-dashed border-gray-600 backdrop-blur-sm" },
                React.createElement(Eye, { className: "w-20 h-20 text-purple-400 mx-auto mb-6 animate-pulse" }),
                React.createElement('p', { className: "text-purple-400 text-xl font-bold mb-2" }, "🔮 AI Ready for Recognition"),
                React.createElement('p', { className: "text-sm text-gray-400 mb-4" }, "Scan or upload a Magic card to get started"),
                React.createElement('div', { className: "flex items-center justify-center gap-2 text-xs" },
                  apiStatus === 'connected' ?
                    React.createElement('span', { className: "text-green-400" }, "✅ Connected to Scryfall database") :
                    React.createElement('span', { className: "text-yellow-400" }, "🔄 Using offline card data")
                )
              )
            )
          )
        ),
        React.createElement('canvas', { ref: canvasRef, className: "hidden" })
      ),

      // Search Tab
      activeTab === 'search' && React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "bg-black/20 rounded-2xl p-8 border border-white/10 backdrop-blur-sm" },
          React.createElement('h2', { className: "text-2xl font-bold mb-6 flex items-center gap-3" },
            React.createElement(Search, { className: "w-7 h-7 text-blue-400" }),
            "🔍 Card Database",
            cardDatabase.length > 0 && React.createElement('span', { className: "text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full" }, `${cardDatabase.length.toLocaleString()} cards loaded`)
          ),
          
          React.createElement('div', { className: "relative mb-8" },
            React.createElement(Search, { className: "absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" }),
            React.createElement('input', {
              type: "text",
              placeholder: "🔮 Search cards by name, type, or text... (e.g. 'Lightning Bolt', 'Planeswalker', 'Blue instant')",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: "w-full pl-12 pr-6 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none backdrop-blur-sm text-lg transition-all duration-300"
            })
          ),
          
          React.createElement('div', { className: "grid gap-6" },
            isLoadingDatabase ? React.createElement('div', { className: "text-center py-16" },
              React.createElement(Loader, { className: "w-20 h-20 text-blue-400 mx-auto mb-6 animate-spin" }),
              React.createElement('p', { className: "text-blue-400 text-2xl font-bold mb-2" }, "🔮 Loading MTG Database..."),
              React.createElement('p', { className: "text-sm text-gray-400" }, "Connecting to Scryfall API")
            ) : searchQuery === '' ? React.createElement('div', { className: "text-center py-16" },
              React.createElement(Search, { className: "w-20 h-20 text-purple-400 mx-auto mb-6 animate-bounce" }),
              React.createElement('p', { className: "text-purple-400 text-2xl font-bold mb-2" }, `🔍 Search ${cardDatabase.length.toLocaleString()}+ MTG Cards`),
              React.createElement('p', { className: "text-lg text-gray-400 mb-4" }, 'Try searching for "Lightning Bolt", "Planeswalker", or "Blue instant"'),
              React.createElement('div', { className: "flex justify-center" }, React.createElement(ApiStatusIndicator))
            ) : isLoading ? React.createElement('div', { className: "text-center py-16" },
              React.createElement(Loader, { className: "w-20 h-20 text-blue-400 mx-auto mb-6 animate-spin" }),
              React.createElement('p', { className: "text-blue-400 text-2xl font-bold" }, "🔍 Searching Cards...")
            ) : searchResults.length > 0 ? React.createElement('div', { className: "grid gap-6" },
              searchResults.map(card =>
                React.createElement('div', { key: card.id, className: "transform hover:scale-[1.02] transition-transform duration-300" },
                  React.createElement(CardDisplay, { card: card })
                )
              )
            ) : React.createElement('div', { className: "text-center py-16" },
              React.createElement(Search, { className: "w-20 h-20 text-gray-500 mx-auto mb-6" }),
              React.createElement('p', { className: "text-gray-400 text-2xl font-bold mb-2" }, `No cards found for "${searchQuery}"`),
              React.createElement('p', { className: "text-lg text-gray-500" }, "Try different search terms or check spelling")
            )
          )
        )
      ),

      // Collection Tab
      activeTab === 'collection' && React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "bg-black/20 rounded-2xl p-8 border border-white/10 backdrop-blur-sm" },
          React.createElement('div', { className: "flex justify-between items-center mb-8" },
            React.createElement('h2', { className: "text-2xl font-bold flex items-center gap-3" },
              React.createElement(BookOpen, { className: "w-7 h-7 text-blue-400" }),
              "📚 My Collection",
              collection.length > 0 && React.createElement('span', { className: "text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full" }, `${totalCards} total cards`)
            ),
            React.createElement('div', { className: "text-right" },
              React.createElement('div', { className: "text-3xl font-bold text-green-400 mb-1" }, formatPrice(collectionValue)),
              React.createElement('div', { className: "text-sm text-gray-400" }, "💎 Total Value")
            )
          ),
          
          collection.length > 0 ? React.createElement('div', { className: "grid gap-6" },
            collection.map(card =>
              React.createElement('div', { key: `${card.id}-${card.dateAdded}`, className: "bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl p-6 border border-gray-600 backdrop-blur-sm" },
                React.createElement('div', { className: "flex justify-between items-start" },
                  React.createElement('div', { className: "flex-1" },
                    React.createElement('h3', { className: "text-2xl font-bold text-white mb-2" }, card.name),
                    React.createElement('div', { className: "flex items-center gap-4 mb-3 flex-wrap" },
                      React.createElement('span', { className: "text-blue-400 font-mono text-lg" }, card.manaCost),
                      React.createElement('span', { className: `font-semibold ${getRarityColor(card.rarity)}` }, card.rarity),
                      React.createElement('span', { className: "text-gray-400" }, `Qty: ${card.quantity}`),
                      card.setName && React.createElement('span', { className: "text-gray-500 text-sm" }, card.setName)
                    ),
                    React.createElement('p', { className: "text-gray-400 mb-2" }, card.type),
                    card.artist && React.createElement('p', { className: "text-gray-500 text-sm" }, `Art by ${card.artist}`)
                  ),
                  React.createElement('div', { className: "text-right ml-6" },
                    React.createElement('div', { className: "text-2xl font-bold text-green-400 mb-1" }, formatPrice(card.price * card.quantity)),
                    React.createElement('div', { className: "text-sm text-gray-400" }, `${formatPrice(card.price)} each`),
                    card.dateAdded && React.createElement('div', { className: "text-xs text-gray-500 mt-1" }, `Added ${new Date(card.dateAdded).toLocaleDateString()}`)
                  )
                ),
                React.createElement('div', { className: "bg-gray-800/50 rounded-lg p-4 mt-4" },
                  React.createElement('p', { className: "text-gray-300 text-sm leading-relaxed" }, card.text)
                ),
                card.power && card.toughness && React.createElement('div', { className: "flex items-center gap-2 mt-4" },
                  React.createElement(Swords, { className: "w-4 h-4 text-red-400" }),
                  React.createElement('span', { className: "text-white font-bold" }, `${card.power}/${card.toughness}`)
                ),
                React.createElement('div', { className: "flex gap-3 mt-4" },
                  React.createElement('button', {
                    onClick: () => addToCollection(card),
                    className: "flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
                  }, "➕ Add Another"),
                  React.createElement('button', {
                    onClick: () => setCollection(collection.filter(c => c.id !== card.id)),
                    className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  }, "🗑️ Remove"),
                  card.scryfallUrl && React.createElement('button', {
                    onClick: () => window.open(card.scryfallUrl, '_blank'),
                    className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  }, React.createElement(Eye, { className: "w-4 h-4" }))
                )
              )
            )
          ) : React.createElement('div', { className: "text-center py-16" },
            React.createElement(BookOpen, { className: "w-20 h-20 text-purple-400 mx-auto mb-6 animate-bounce" }),
            React.createElement('p', { className: "text-purple-400 text-2xl font-bold mb-2" }, "📚 Start Your Collection"),
            React.createElement('p', { className: "text-lg text-gray-400 mb-6" }, "Scan or search for cards to add them to your collection"),
            React.createElement('div', { className: "flex gap-4 justify-center" },
              React.createElement('button', {
                onClick: () => setActiveTab('scanner'),
                className: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
              },
                React.createElement(Camera, { className: "w-5 h-5" }),
                "Start Scanning"
              ),
              React.createElement('button', {
                onClick: () => setActiveTab('search'),
                className: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
              },
                React.createElement(Search, { className: "w-5 h-5" }),
                "Search Cards"
              )
            )
          )
        )
      )
    ),

    // Floating Action Button
    activeTab !== 'scanner' && React.createElement('button', {
      onClick: () => setActiveTab('scanner'),
      className: "fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-50"
    },
      React.createElement(Camera, { className: "w-8 h-8" })
    )
  );
};

// Render the component
ReactDOM.render(React.createElement(MTGCardScanner), document.getElementById('root')); "flex justify-between items-start mb-4" },
        React.createElement('div', { className: "flex-1" },
          React.createElement('h3', { className: "text-2xl font-bold text-white mb-2" }, card.name),
          React.createElement('div', { className: "flex items-center gap-3 mb-2 flex-wrap" },
            React.createElement('span', { className: "text-lg font-mono text-blue-400" }, card.manaCost),
            React.createElement('span', { className: `font-semibold ${getRarityColor(card.rarity)}` }, card.rarity),
            card.setName && React.createElement('span', { className: "text-gray-500 text-sm" }, card.setName)
          ),
          React.createElement('p', { className: "text-gray-400 text-sm mb-3" }, card.type),
          card.artist && React.createElement('p', { className: "text-gray-500 text-xs mb-3" }, `Art by ${card.artist}`)
        ),
        React.createElement('div', { className: "text-right ml-4" },
          React.createElement('div', { className: "text-2xl font-bold text-green-400 mb-1" }, formatPrice(card.price)),
          card.confidence && React.createElement('div', { className: "text-xs text-purple-400 mb-1 animate-pulse" }, `${card.confidence}% confidence`),
          card.cmc !== undefined && React.createElement('div', { className: "text-xs text-blue-400" }, `CMC: ${card.cmc}`)
        )
      ),
      React.createElement('div', { className: "bg-gray-800 rounded-lg p-4 mb-4" },
        React.createElement('p', { className: "text-gray-300 text-sm leading-relaxed" }, card.text)
      ),
      card.power && card.toughness && React.createElement('div', { className: "flex items-center gap-2 mb-4" },
        React.createElement(Swords, { className: "w-4 h-4 text-red-400" }),
        React.createElement('span', { className: "text-white font-bold" }, `${card.power}/${card.toughness}`)
      ),
      showActions && React.createElement('div', { className: "flex gap-2" },
        React.createElement('button', {
          onClick: () => addToCollection(card),
          className: "flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
        },
          React.createElement(Star, { className: "w-4 h-4" }),
          "Add to Collection"
        ),
        card.scryfallUrl && React.createElement('button', {
          onClick: () => window.open(card.scryfallUrl, '_blank'),
          className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        },
          React.createElement(Eye, { className: "w-4 h-4" })
        )
      )
    )
  );

  const ApiStatusIndicator = () => (
    React.createElement('div', { className: "flex items-center gap-2 text-sm" },
      apiStatus === 'connected' && [
        React.createElement(Wifi, { key: "icon", className: "w-4 h-4 text-green-400" }),
        React.createElement('span', { key: "text", className: "text-green-400" }, "Scryfall Connected")
      ],
      apiStatus === 'connecting' && [
        React.createElement(Loader, { key: "icon", className: "w-4 h-4 text-yellow-400 animate-spin" }),
        React.createElement('span', { key: "text", className: "text-yellow-400" }, "Connecting...")
      ],
      apiStatus === 'error' && [
        React.createElement(WifiOff, { key: "icon", className: "w-4 h-4 text-red-400" }),
        React.createElement('span', { key: "text", className: "text-red-400" }, "Using Offline Data")
      ]
    )
  );

  const collectionValue = collection.reduce((sum, card) => sum + (card.price * card.quantity), 0);
  const totalCards = collection.reduce((sum, card) => sum + card.quantity, 0);

  return React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white" },
    // Enhanced Header with floating effect
    React.createElement('div', { className: "bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50" },
      React.createElement('div', { className:
React.createElement(Camera, { className: "w-8 h-8" })
    )
  );
};

// Render the component
ReactDOM.render(React.createElement(MTGCardScanner), document.getElementById('root'));
