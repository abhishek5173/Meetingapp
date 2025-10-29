declare module 'react-native-get-sms-android' {
  const SmsAndroid: {
    list: (
      filter: string,
      successCallback: (count: number, smsList: string) => void,
      errorCallback: (error: any) => void
    ) => void;
  };
  export default SmsAndroid;
}