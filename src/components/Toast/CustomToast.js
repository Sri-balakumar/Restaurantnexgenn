import { FONT_FAMILY } from '@constants/theme';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
<<<<<<< HEAD
const CustomToast = {
=======
export default CustomToast = {
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    success: (props) => (
        <BaseToast
            {...props}
            style={{ borderLeftColor: 'green' }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
                fontSize: 15,
                fontWeight: '400',
                fontFamily: FONT_FAMILY.urbanistBold
            }}
            text2Style={{
                fontSize: 13,
                fontFamily: FONT_FAMILY.urbanistBold,
                fontWeight: '400',
            }}
        />
    ),

    error: (props) => (
        <ErrorToast
            {...props}
            text1Style={{
                fontSize: 15,
                fontFamily: FONT_FAMILY.urbanistBold,
                fontWeight: '400',
            }}
            text2Style={{
                fontSize: 13,
                fontFamily: FONT_FAMILY.urbanistBold,
                fontWeight: '400',
            }}
        />
    ),
<<<<<<< HEAD
};

export default CustomToast;
=======
};
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
