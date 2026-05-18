import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// @stripe/stripe-react-native's PaymentMethodMessagingElement uses forwardRef
// without a ref parameter — harmless, but React 19 warns about it.
LogBox.ignoreLogs(['forwardRef render functions accept exactly two parameters']);

import App from './App';

registerRootComponent(App);
